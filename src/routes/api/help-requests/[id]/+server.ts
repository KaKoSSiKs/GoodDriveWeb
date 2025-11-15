import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { decodeVIN } from '$lib/utils/vin-decoder.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		
		if (isNaN(id)) {
			return json(
				{
					success: false,
					error: 'Invalid request ID'
				},
				{ status: 400 }
			);
		}

		const helpRequest = await prisma.helpRequest.findUnique({
			where: { id }
		});

		if (!helpRequest) {
			return json(
				{
					success: false,
					error: 'Help request not found'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: helpRequest
		});
	} catch (error) {
		console.error('Error fetching help request:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch help request'
			},
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		
		if (isNaN(id)) {
			return json(
				{
					success: false,
					error: 'Invalid request ID'
				},
				{ status: 400 }
			);
		}

		const data = await request.json();
		const { status, decodeVin } = data;

		// Проверяем существование запроса
		const existingRequest = await prisma.helpRequest.findUnique({
			where: { id }
		});

		if (!existingRequest) {
			return json(
				{
					success: false,
					error: 'Help request not found'
				},
				{ status: 404 }
			);
		}

		// Если запрошено повторное декодирование VIN
		if (decodeVin === true && existingRequest.vin) {
			try {
				const vinToDecode = existingRequest.vin.trim().toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
				
				console.log('Re-decoding VIN for request', id, 'Original VIN:', existingRequest.vin, 'Normalized VIN:', vinToDecode, 'Length:', vinToDecode.length);
				
				if (vinToDecode.length !== 17) {
					console.error('Invalid VIN length:', vinToDecode.length, 'VIN:', vinToDecode);
					return json(
						{
							success: false,
							error: `Неверная длина VIN-номера. Ожидается 17 символов, получено ${vinToDecode.length}. Пожалуйста, проверьте правильность VIN-номера.`
						},
						{ status: 400 }
					);
				}
				
				const vehicleInfo = await decodeVIN(vinToDecode);
				console.log('VIN decode result:', vehicleInfo ? 'SUCCESS' : 'NULL', vehicleInfo);
				
				if (vehicleInfo) {
					console.log('VIN re-decoded successfully:', JSON.stringify(vehicleInfo, null, 2));
					
					// Подготавливаем данные для обновления
					const updateData: any = {
						...(status && { status }),
						// Обновляем VIN нормализованным значением (на случай если он был исправлен)
						vin: vinToDecode
					};
					
					// Добавляем декодированные данные об автомобиле
					if (vehicleInfo.year) updateData.vehicleYear = vehicleInfo.year;
					if (vehicleInfo.brand) updateData.vehicleBrand = vehicleInfo.brand;
					if (vehicleInfo.model) updateData.vehicleModel = vehicleInfo.model;
					if (vehicleInfo.modification) updateData.vehicleModification = vehicleInfo.modification;
					if (vehicleInfo.color) updateData.vehicleColor = vehicleInfo.color;
					if (vehicleInfo.vehicleType) updateData.vehicleType = vehicleInfo.vehicleType;
					if (vehicleInfo.vehicleCategory) updateData.vehicleCategory = vehicleInfo.vehicleCategory;
					if (vehicleInfo.engineType) updateData.engineType = vehicleInfo.engineType;
					if (vehicleInfo.engineVolume) updateData.engineVolume = vehicleInfo.engineVolume;
					if (vehicleInfo.enginePowerHp) updateData.enginePowerHp = vehicleInfo.enginePowerHp;
					if (vehicleInfo.enginePowerKw !== undefined && vehicleInfo.enginePowerKw !== null) {
						updateData.enginePowerKw = vehicleInfo.enginePowerKw;
					}
					if (vehicleInfo.engineNumber) updateData.engineNumber = vehicleInfo.engineNumber;
					if (vehicleInfo.bodyNumber) updateData.bodyNumber = vehicleInfo.bodyNumber;
					if (vehicleInfo.chassisNumber) updateData.chassisNumber = vehicleInfo.chassisNumber;
					if (vehicleInfo.bodyType) updateData.bodyType = vehicleInfo.bodyType;
					if (vehicleInfo.maxMass) updateData.maxMass = vehicleInfo.maxMass;
					if (vehicleInfo.unladenMass) updateData.unladenMass = vehicleInfo.unladenMass;
					if (vehicleInfo.transmissionType) updateData.transmissionType = vehicleInfo.transmissionType;
					if (vehicleInfo.driveType) updateData.driveType = vehicleInfo.driveType;
					if (vehicleInfo.passengerSeats) updateData.passengerSeats = vehicleInfo.passengerSeats;
					if (vehicleInfo.ecoClass) updateData.ecoClass = vehicleInfo.ecoClass;
					if (vehicleInfo.manufacturerCountry) updateData.manufacturerCountry = vehicleInfo.manufacturerCountry;
					
					// Сохраняем дополнительные данные в JSON
					if (vehicleInfo.rawData) {
						updateData.vehicleData = JSON.stringify({ rawData: vehicleInfo.rawData });
					}
					
					// Обновляем запрос с декодированными данными
					const updatedRequest = await prisma.helpRequest.update({
						where: { id },
						data: updateData
					});

					return json({
						success: true,
						data: updatedRequest,
						message: 'VIN успешно декодирован'
					});
				} else {
					console.warn('VIN re-decoding returned null for:', existingRequest.vin);
					return json(
						{
							success: false,
							error: 'Не удалось декодировать VIN-номер'
						},
						{ status: 400 }
					);
				}
			} catch (vinError) {
				console.error('Error re-decoding VIN:', vinError);
				console.error('Error details:', {
					message: vinError instanceof Error ? vinError.message : String(vinError),
					stack: vinError instanceof Error ? vinError.stack : undefined,
					name: vinError instanceof Error ? vinError.name : undefined
				});
				return json(
					{
						success: false,
						error: `Ошибка при декодировании VIN-номера: ${vinError instanceof Error ? vinError.message : 'Неизвестная ошибка'}`
					},
					{ status: 500 }
				);
			}
		}

		// Валидация статуса
		const validStatuses = ['new', 'processing', 'completed', 'canceled'];
		if (status && !validStatuses.includes(status)) {
			return json(
				{
					success: false,
					error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Обновляем запрос
		const updatedRequest = await prisma.helpRequest.update({
			where: { id },
			data: {
				...(status && { status })
			}
		});

		return json({
			success: true,
			data: updatedRequest
		});
	} catch (error) {
		console.error('Error updating help request:', error);
		return json(
			{
				success: false,
				error: 'Failed to update help request'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		
		if (isNaN(id)) {
			return json(
				{
					success: false,
					error: 'Invalid request ID'
				},
				{ status: 400 }
			);
		}

		// Проверяем существование запроса
		const existingRequest = await prisma.helpRequest.findUnique({
			where: { id }
		});

		if (!existingRequest) {
			return json(
				{
					success: false,
					error: 'Help request not found'
				},
				{ status: 404 }
			);
		}

		// Удаляем запрос
		await prisma.helpRequest.delete({
			where: { id }
		});

		return json({
			success: true,
			message: 'Help request deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting help request:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete help request'
			},
			{ status: 500 }
		);
	}
};

