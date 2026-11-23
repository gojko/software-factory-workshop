import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createAvailabilityRouter } from './api/availability-router.js';
import { createErrorHandler } from './api/error-handler.js';
import { createReservationsRouter } from './api/reservations-router.js';
import { createRoomTypesRouter } from './api/room-types-router.js';
import { createRoomsRouter } from './api/rooms-router.js';
import { createSettingsRouter } from './api/settings-router.js';
import { createSetupRouter } from './api/setup-router.js';
import { createTransactionRunner } from './db/open-database.js';
import { createReservationRepository } from './db/reservation-repository.js';
import { createRoomRepository } from './db/room-repository.js';
import { createRoomTypeRepository } from './db/room-type-repository.js';
import { createSettingsRepository } from './db/settings-repository.js';
import { createAvailabilityService } from './domain/availability-service.js';
import { createBookingService } from './domain/booking-service.js';
import { generateConfirmationCode } from './domain/confirmation-code.js';
import { createReservationLookupService } from './domain/reservation-lookup-service.js';
import { createRoomService } from './domain/room-service.js';
import { createRoomTypeService } from './domain/room-type-service.js';
import { createSettingsService } from './domain/settings-service.js';
import { createSetupStateService } from './domain/setup-state-service.js';
import { createGreeting } from './greeting.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export const createApp = function (database, { clock = Date } = {}) {
	const app = express();
	app.locals.database = database;
	app.locals.clock = clock;
	app.use(express.json());
	const settingsRepository = createSettingsRepository(database);
	const settingsService = createSettingsService({ settings: settingsRepository });
	app.use(createSettingsRouter(settingsService));
	const transaction = createTransactionRunner(database);
	const roomTypeRepository = createRoomTypeRepository(database);
	const roomRepository = createRoomRepository(database);
	const reservationRepository = createReservationRepository(database);
	const roomTypeService = createRoomTypeService({
		roomTypes: roomTypeRepository,
		rooms: roomRepository,
		reservations: reservationRepository,
		transaction
	});
	app.use(createRoomTypesRouter(roomTypeService));
	const roomService = createRoomService({
		roomTypes: roomTypeRepository,
		rooms: roomRepository,
		reservations: reservationRepository,
		transaction
	});
	app.use(createRoomsRouter(roomService));
	const availabilityService = createAvailabilityService({
		roomTypes: roomTypeRepository,
		rooms: roomRepository,
		reservations: reservationRepository,
		clock,
		settings: settingsRepository
	});
	app.use(createAvailabilityRouter(availabilityService));
	const bookingService = createBookingService({
		roomTypes: roomTypeRepository,
		rooms: roomRepository,
		reservations: reservationRepository,
		settings: settingsRepository,
		transaction,
		clock,
		generateCode: () => generateConfirmationCode()
	});
	const lookupService = createReservationLookupService({ reservations: reservationRepository });
	app.use(createReservationsRouter(bookingService, lookupService));
	const setupStateService = createSetupStateService({
		roomTypes: roomTypeRepository,
		rooms: roomRepository
	});
	app.use(createSetupRouter(setupStateService));
	app.get('/api/greeting', (request, response) => {
		response.json(createGreeting());
	});
	app.use(express.static(PUBLIC_DIR));
	app.use(createErrorHandler());
	return app;
};
