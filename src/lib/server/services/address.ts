import { env } from '$env/dynamic/private';

const DADATA_API_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs';
const DADATA_CLEAN_URL = 'https://cleaner.dadata.ru/api/v1/clean/address';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const DADATA_TOKEN = env.DADATA_API_TOKEN || env.DADATA_TOKEN || '';
const DADATA_SECRET = env.DADATA_SECRET || env.DADATA_API_SECRET || '';
const GEO_ALLOW_INSECURE = env.GEO_ALLOW_INSECURE === 'true';

if (GEO_ALLOW_INSECURE && typeof process !== 'undefined') {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

interface DadataRequestOptions {
	requireSecret?: boolean;
}

interface SuggestionOptions {
	limit?: number;
	city?: string;
	cityFiasId?: string;
	fromBound?: string;
	toBound?: string;
	restrictValue?: boolean;
}

interface OsmResult {
	display_name: string;
	lat: string;
	lon: string;
	address?: Record<string, string>;
}

export interface AddressSuggestion {
	value: string;
	unrestricted_value?: string;
	data: Record<string, any>;
}

export interface AddressValidationResult {
	isValid: boolean;
	source: string;
	result?: string;
	qc?: string;
	data?: Record<string, any>;
	warning?: string;
}

function assertTokenConfigured() {
	if (!DADATA_TOKEN) {
		throw new Error('DADATA_API_TOKEN environment variable is not configured');
	}
}

function assertSecretConfigured() {
	if (!DADATA_SECRET) {
		throw new Error('DADATA_SECRET (or DADATA_API_SECRET) environment variable is not configured');
	}
}

async function dadataFetch<T>(url: string, payload: unknown, options: DadataRequestOptions = {}): Promise<T> {
	assertTokenConfigured();

	if (options.requireSecret) {
		assertSecretConfigured();
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
		Authorization: `Token ${DADATA_TOKEN}`
	};

	if (DADATA_SECRET) {
		headers['X-Secret'] = DADATA_SECRET;
	}

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Dadata request failed: ${response.status} ${response.statusText} - ${text}`);
	}

	return response.json() as Promise<T>;
}

async function osmFetch(params: Record<string, string>): Promise<OsmResult[]> {
	const query = new URLSearchParams({
		format: 'jsonv2',
		addressdetails: '1',
		countrycodes: 'ru',
		limit: '6',
		...params
	});

	const response = await fetch(`${NOMINATIM_URL}?${query.toString()}`, {
		headers: {
			'User-Agent': 'GoodDriveWeb/1.0 (support@gooddrive.ru)',
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Nominatim request failed: ${response.status} ${response.statusText} - ${text}`);
	}

	return (await response.json()) as OsmResult[];
}

function resolveCity(address: Record<string, string> = {}) {
	return (
		address.city ||
		address.town ||
		address.village ||
		address.hamlet ||
		address.municipality ||
		address.county ||
		address.state
	);
}

function resolveSettlement(address: Record<string, string> = {}) {
	return address.town || address.village || address.hamlet || address.suburb;
}

function resolveArea(address: Record<string, string> = {}) {
	return address.county || address.district || address.state_district;
}

function resolveRegion(address: Record<string, string> = {}) {
	return address.state || address.region || address.province;
}

function resolveStreet(address: Record<string, string> = {}) {
	return address.road || address.residential || address.pedestrian || address.path;
}

function mapOsmResultToSuggestion(result: OsmResult, options: SuggestionOptions): AddressSuggestion {
	const address = result.address || {};
	const city = resolveCity(address);
	const settlement = resolveSettlement(address);
	const street = resolveStreet(address);
	const house = address.house_number || '';
	const postalCode = address.postcode;
	const region = resolveRegion(address);
	const area = resolveArea(address);

	const isCityQuery = options.fromBound === 'city';
	const mainValue = isCityQuery
		? (city || settlement || result.display_name)
		: [street, house].filter(Boolean).join(', ') || result.display_name;

	return {
		value: mainValue,
		unrestricted_value: result.display_name,
		data: {
			city_with_type: city,
			settlement_with_type: settlement,
			area_with_type: area,
			region_with_type: region,
			postal_code: postalCode,
			latitude: result.lat,
			longitude: result.lon
		}
	};
}

async function fetchAddressSuggestionsFromDadata(
	query: string,
	options: SuggestionOptions
): Promise<AddressSuggestion[]> {
	const payload: Record<string, any> = {
		query,
		count: options.limit ?? 6,
		restrict_value: options.restrictValue ?? true
	};

	const locationFilter: Record<string, string> = {
		country_iso_code: 'RU'
	};

	if (options.cityFiasId) {
		locationFilter.city_fias_id = options.cityFiasId;
	} else if (options.city) {
		locationFilter.city = options.city;
	}

	payload.locations = [locationFilter];

	if (options.fromBound) {
		payload.from_bound = { value: options.fromBound };
	}
	if (options.toBound) {
		payload.to_bound = { value: options.toBound };
	}

	const data = await dadataFetch<{ suggestions: AddressSuggestion[] }>(
		`${DADATA_API_URL}/suggest/address`,
		payload
	);

	return data?.suggestions ?? [];
}

async function fetchAddressSuggestionsFromOsm(
	query: string,
	options: SuggestionOptions
): Promise<AddressSuggestion[]> {
	const isCityQuery = options.fromBound === 'city';
	const limit = options.limit ? String(options.limit) : '6';

	const params: Record<string, string> = {
		limit,
		q: isCityQuery ? query : options.city ? `${options.city} ${query}` : query
	};

	const results = await osmFetch(params);

	const filtered = isCityQuery
		? results.filter(result => {
				const city = resolveCity(result.address || {});
				return city?.toLowerCase().includes(query.trim().toLowerCase());
			})
		: results;

	return filtered.slice(0, Number(limit)).map(result => mapOsmResultToSuggestion(result, options));
}

async function validateAddressWithDadata(address: string): Promise<AddressValidationResult> {
	const payload = [address];
	const data = await dadataFetch<Array<Record<string, any>>>(DADATA_CLEAN_URL, payload, {
		requireSecret: true
	});
	const [result] = data || [];

	if (!result) {
		return {
			isValid: false,
			source: address,
			warning: 'Dadata не вернула результат проверки'
		};
	}

	const isValid = result.qc === '0';

	return {
		isValid,
		source: address,
		result: result.result ?? undefined,
		qc: result.qc,
		data: result as Record<string, any>,
		warning:
			!isValid && result.qc_description
				? result.qc_description
				: !isValid
					? 'Адрес не прошёл проверку по базе ФИАС'
					: undefined
	};
}

async function validateAddressWithOsm(address: string): Promise<AddressValidationResult> {
	const results = await osmFetch({
		limit: '1',
		q: address
	});

	const [result] = results;

	if (!result) {
		return {
			isValid: false,
			source: address,
			warning: 'Адрес не найден в базе OpenStreetMap'
		};
	}

	const suggestion = mapOsmResultToSuggestion(result, {});

	return {
		isValid: true,
		source: address,
		result: suggestion.unrestricted_value,
		data: suggestion.data
	};
}

export function hasDadataCredentials() {
	return Boolean(DADATA_TOKEN && DADATA_SECRET);
}

export function hasDadataToken() {
	return Boolean(DADATA_TOKEN);
}

export async function fetchAddressSuggestions(
	query: string,
	options: SuggestionOptions = {}
): Promise<AddressSuggestion[]> {
	if (!query?.trim()) {
		return [];
	}

	if (hasDadataToken()) {
		try {
			return await fetchAddressSuggestionsFromDadata(query, options);
		} catch (error) {
			console.error('DaData suggestions failed, fallback to OpenStreetMap:', error);
		}
	}

	try {
		return await fetchAddressSuggestionsFromOsm(query, options);
	} catch (error) {
		console.error('OpenStreetMap suggestions failed:', error);
	}

	// Последний резерв — пробуем бесплатный сервис geocode.maps.co
	try {
		const response = await fetch(
			`https://geocode.maps.co/search?q=${encodeURIComponent(options.city ? `${options.city} ${query}` : query)}&limit=${
				options.limit ?? 6
			}&countrycodes=ru`,
			{
				headers: {
					'User-Agent': 'GoodDriveWeb/1.0 (support@gooddrive.ru)',
					Accept: 'application/json'
				}
			}
		);

		if (!response.ok) {
			throw new Error(`maps.co request failed: ${response.status} ${response.statusText}`);
		}

		const mapsResults = (await response.json()) as Array<{
			display_name: string;
			address?: Record<string, string>;
		}>;

		return mapsResults.map(result =>
			mapOsmResultToSuggestion(
				{
					display_name: result.display_name,
					lat: result?.lat || '',
					lon: result?.lon || '',
					address: result.address
				} as OsmResult,
				options
			)
		);
	} catch (error) {
		console.error('maps.co suggestions failed:', error);
	}

	return [];
}

export async function validateAddress(address: string): Promise<AddressValidationResult> {
	if (!address?.trim()) {
		throw new Error('Адрес не указан для проверки');
	}

	if (hasDadataCredentials()) {
		try {
			return await validateAddressWithDadata(address);
		} catch (error) {
			console.error('DaData validation failed, fallback to OpenStreetMap:', error);
		}
	}

	try {
		return await validateAddressWithOsm(address);
	} catch (error) {
		console.error('OpenStreetMap validation failed:', error);
	}

	// maps.co в качестве последнего резерва
	try {
		const response = await fetch(
			`https://geocode.maps.co/search?q=${encodeURIComponent(address)}&limit=1&countrycodes=ru`,
			{
				headers: {
					'User-Agent': 'GoodDriveWeb/1.0 (support@gooddrive.ru)',
					Accept: 'application/json'
				}
			}
		);

		if (!response.ok) {
			throw new Error(`maps.co validation failed: ${response.status} ${response.statusText}`);
		}

		const [result] = (await response.json()) as Array<{
			display_name: string;
			address?: Record<string, string>;
		}> ?? [];

		if (!result) {
			return {
				isValid: false,
				source: address,
				warning: 'Адрес не найден в базе геокодера'
			};
		}

		const suggestion = mapOsmResultToSuggestion(
			{
				display_name: result.display_name,
				lat: result?.lat || '',
				lon: result?.lon || '',
				address: result.address
			} as OsmResult,
			{}
		);

		return {
			isValid: true,
			source: address,
			result: suggestion.unrestricted_value,
			data: suggestion.data
		};
	} catch (error) {
		console.error('maps.co validation failed:', error);
	}

	return {
		isValid: false,
		source: address,
		warning: 'Не удалось подтвердить адрес. Попробуйте снова позже.'
	};
}

