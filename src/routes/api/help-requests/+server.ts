import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { decodeVIN } from '$lib/utils/vin-decoder.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const status = url.searchParams.get('status') || undefined;
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const page = parseInt(url.searchParams.get('page') || '1');
		const skip = (page - 1) * limit;

		// Фильтруем по статусу, если указан
		const where = status ? { status } : {};

		// Проверяем, что модель доступна
		if (!prisma.helpRequest) {
			console.error('Prisma Client does not have helpRequest model. Please run: npx prisma generate');
			return json(
				{
					success: false,
					error: 'Database configuration error. Please run: npx prisma generate'
				},
				{ status: 500 }
			);
		}

		// Получаем запросы с пагинацией
		const [requests, total] = await Promise.all([
			prisma.helpRequest.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			prisma.helpRequest.count({ where })
		]);

		return json({
			success: true,
			data: {
				results: requests,
				count: total,
				page,
				limit,
				totalPages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching help requests:', error);
		
		// Более детальная обработка ошибок Prisma
		let errorMessage = 'Failed to fetch help requests';
		
		if (error && typeof error === 'object' && 'code' in error) {
			const prismaError = error as any;
			
			// Если таблица не существует
			if (prismaError.code === 'P2021' || prismaError.code === 'P2025') {
				console.error('Table does not exist. Please run migration: npx prisma migrate dev --name add_help_requests');
				errorMessage = 'Database table not found. Please run migration.';
			}
			// Если Prisma Client не знает о модели
			else if (prismaError.message?.includes('helpRequest') || prismaError.message?.includes('Unknown model')) {
				console.error('Prisma Client does not know about HelpRequest model. Please run: npx prisma generate');
				errorMessage = 'Prisma Client not updated. Please run: npx prisma generate';
			}
		}
		
		// Логируем полную информацию об ошибке
		if (error instanceof Error) {
			console.error('Error details:', {
				message: error.message,
				stack: error.stack,
				name: error.name
			});
		} else {
			console.error('Error details:', error);
		}
		
		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Валидация
		const errors = [];

		if (!data.name || data.name.trim() === '') {
			errors.push('Имя обязательно');
		}

		if (!data.phone || data.phone.trim() === '') {
			errors.push('Телефон обязателен');
		} else {
			// Нормализуем телефон: удаляем все кроме цифр и +
			const cleanedPhone = data.phone.trim().replace(/[\s\-\(\)]/g, '');
			const digitsOnly = cleanedPhone.replace(/\+/g, '');
			
			// Проверяем количество цифр (11-12)
			if (digitsOnly.length < 11 || digitsOnly.length > 12) {
				errors.push('Телефон должен содержать от 11 до 12 цифр');
			} else {
				data.phone = cleanedPhone; // Используем нормализованный телефон
			}
		}

		if (data.message && data.message.length > 300) {
			errors.push('Комментарий не должен превышать 300 символов');
		}

		if (errors.length > 0) {
			return json(
				{
					success: false,
					error: errors.join(', ')
				},
				{ status: 400 }
			);
		}

		// Проверяем, что модель доступна (на случай если Prisma Client не обновлен)
		if (!prisma.helpRequest) {
			console.error('Prisma Client does not have helpRequest model. Please run: npx prisma generate');
			return json(
				{
					success: false,
					error: 'Ошибка конфигурации. Пожалуйста, обратитесь к администратору.'
				},
				{ status: 500 }
			);
		}

		// Нормализуем и валидируем VIN: преобразуем в верхний регистр, удаляем пробелы и недопустимые символы
		let normalizedVin: string | null = null;
		if (data.vin && data.vin.trim() !== '') {
			const originalVin = data.vin.trim();
			normalizedVin = originalVin.toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
			
			// Проверяем длину после нормализации - должно быть ровно 17 символов
			if (normalizedVin.length !== 17) {
				console.warn('VIN length is not 17 after normalization:', normalizedVin, 'length:', normalizedVin.length, 'original:', originalVin);
				// Если VIN не 17 символов, возвращаем ошибку
				return json(
					{
						success: false,
						error: 'Проверьте VIN-номер ещё раз. VIN должен содержать ровно 17 символов.'
					},
					{ status: 400 }
				);
			}
			
			// Проверяем, что VIN содержит только буквы латиницы и цифры
			if (!/^[A-Z0-9]{17}$/.test(normalizedVin)) {
				return json(
					{
						success: false,
						error: 'Проверьте VIN-номер ещё раз. VIN должен содержать только буквы латиницы и цифры.'
					},
					{ status: 400 }
				);
			}
		}

		// Декодируем VIN-номер, если указан и длина правильная
		let vehicleInfo = null;
		if (normalizedVin && normalizedVin.length === 17) {
			try {
				vehicleInfo = await decodeVIN(normalizedVin);
				if (vehicleInfo) {
					console.log('VIN decoded successfully:', JSON.stringify(vehicleInfo, null, 2));
				} else {
					console.warn('VIN decoding returned null for:', normalizedVin);
				}
			} catch (vinError) {
				console.error('Error decoding VIN:', vinError);
				// Не блокируем создание запроса, если декодирование не удалось
			}
		}

		// Подготавливаем данные для создания запроса (используем нормализованный VIN)
		const requestData: any = {
			type: 'help_request',
			name: data.name.trim(),
			phone: data.phone,
			vin: normalizedVin, // Сохраняем нормализованный VIN в верхнем регистре
			message: data.message?.trim() || null,
			status: 'new'
		};

		// Добавляем декодированные данные об автомобиле (как в СТС)
		if (vehicleInfo) {
			console.log('Adding vehicle data to request:', {
				year: vehicleInfo.year,
				brand: vehicleInfo.brand,
				model: vehicleInfo.model,
				engineVolume: vehicleInfo.engineVolume,
				enginePowerHp: vehicleInfo.enginePowerHp,
				ecoClass: vehicleInfo.ecoClass
			});
			
			// Основные данные
			if (vehicleInfo.year) requestData.vehicleYear = vehicleInfo.year;
			if (vehicleInfo.brand) requestData.vehicleBrand = vehicleInfo.brand;
			if (vehicleInfo.model) requestData.vehicleModel = vehicleInfo.model;
			if (vehicleInfo.modification) requestData.vehicleModification = vehicleInfo.modification;
			if (vehicleInfo.color) requestData.vehicleColor = vehicleInfo.color;
			
			// Тип и категория ТС
			if (vehicleInfo.vehicleType) requestData.vehicleType = vehicleInfo.vehicleType;
			if (vehicleInfo.vehicleCategory) requestData.vehicleCategory = vehicleInfo.vehicleCategory;
			
			// Двигатель
			if (vehicleInfo.engineType) requestData.engineType = vehicleInfo.engineType;
			if (vehicleInfo.engineVolume) requestData.engineVolume = vehicleInfo.engineVolume;
			if (vehicleInfo.enginePowerHp) requestData.enginePowerHp = vehicleInfo.enginePowerHp;
			if (vehicleInfo.enginePowerKw !== undefined && vehicleInfo.enginePowerKw !== null) {
				requestData.enginePowerKw = vehicleInfo.enginePowerKw;
			}
			if (vehicleInfo.engineNumber) requestData.engineNumber = vehicleInfo.engineNumber;
			
			// Кузов и шасси
			if (vehicleInfo.bodyNumber) requestData.bodyNumber = vehicleInfo.bodyNumber;
			if (vehicleInfo.chassisNumber) requestData.chassisNumber = vehicleInfo.chassisNumber;
			if (vehicleInfo.bodyType) requestData.bodyType = vehicleInfo.bodyType;
			
			// Масса
			if (vehicleInfo.maxMass) requestData.maxMass = vehicleInfo.maxMass;
			if (vehicleInfo.unladenMass) requestData.unladenMass = vehicleInfo.unladenMass;
			
			// Трансмиссия и привод
			if (vehicleInfo.transmissionType) requestData.transmissionType = vehicleInfo.transmissionType;
			if (vehicleInfo.driveType) requestData.driveType = vehicleInfo.driveType;
			
			// Дополнительные данные
			if (vehicleInfo.passengerSeats) requestData.passengerSeats = vehicleInfo.passengerSeats;
			if (vehicleInfo.ecoClass) requestData.ecoClass = vehicleInfo.ecoClass;
			if (vehicleInfo.manufacturerCountry) requestData.manufacturerCountry = vehicleInfo.manufacturerCountry;
			
			// Сохраняем все дополнительные данные в JSON (для госномера, ПТС, таможни, пробега, владельцев и т.д.)
			const additionalData: any = {};
			if (vehicleInfo.rawData) additionalData.rawData = vehicleInfo.rawData;
			
			// Сохраняем в JSON только если есть дополнительные данные
			if (Object.keys(additionalData).length > 0) {
				requestData.vehicleData = JSON.stringify(additionalData);
			}
			
			console.log('Request data with vehicle info:', JSON.stringify(requestData, null, 2));
		} else {
			console.log('No vehicle info to add (vehicleInfo is null or empty)');
		}

		// Создаем запрос
		const helpRequest = await prisma.helpRequest.create({
			data: requestData
		});

		// Создаем уведомление для админа
		try {
			await prisma.notification.create({
				data: {
					type: 'help_request',
					title: 'Новый запрос консультации',
					message: `Новый запрос от ${helpRequest.name} (${helpRequest.phone})`,
					link: `/admin/help-requests/${helpRequest.id}`
				}
			});
		} catch (notificationError) {
			console.error('Failed to create notification:', notificationError);
			// Не критично, продолжаем
		}

		return json({
			success: true,
			data: helpRequest,
			message: 'Ваша заявка отправлена. Специалист свяжется с вами в ближайшее время.'
		});
	} catch (error) {
		console.error('Error creating help request:', error);
		
		// Более детальная обработка ошибок Prisma
		let errorMessage = 'Произошла ошибка при отправке заявки. Попробуйте позже или свяжитесь с нами по телефону.';
		
		if (error && typeof error === 'object' && 'code' in error) {
			const prismaError = error as any;
			
			// Если таблица не существует
			if (prismaError.code === 'P2021' || prismaError.code === 'P2025') {
				console.error('Table does not exist. Please run migration: npx prisma migrate dev --name add_help_requests');
				errorMessage = 'Ошибка базы данных. Пожалуйста, обратитесь к администратору.';
			}
			// Если Prisma Client не знает о модели
			else if (prismaError.message?.includes('helpRequest') || prismaError.message?.includes('Unknown model')) {
				console.error('Prisma Client does not know about HelpRequest model. Please run: npx prisma generate');
				errorMessage = 'Ошибка конфигурации. Пожалуйста, обратитесь к администратору.';
			}
		}
		
		// Логируем полную информацию об ошибке для отладки
		if (error instanceof Error) {
			console.error('Error details:', {
				message: error.message,
				stack: error.stack,
				name: error.name
			});
		} else {
			console.error('Error details:', error);
		}
		
		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
};

