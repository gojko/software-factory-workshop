import { beforeEach, describe, expect, test } from '@jest/globals';
import { jest } from '@jest/globals';
import { createSetupStateService } from '../../src/domain/setup-state-service.js';

describe('createSetupStateService', () => {
	let roomTypes;
	let rooms;
	let underTest;

	beforeEach(() => {
		roomTypes = { count: jest.fn() };
		rooms = { count: jest.fn() };
		underTest = createSetupStateService({ roomTypes, rooms });
	});

	test('returns unconfigured when there is no room type', () => {
		roomTypes.count.mockReturnValue(0);
		rooms.count.mockReturnValue(0);

		expect(underTest.state()).toEqual({ state: 'unconfigured' });
	});

	test('returns needs-rooms when there is a room type and no room', () => {
		roomTypes.count.mockReturnValue(1);
		rooms.count.mockReturnValue(0);

		expect(underTest.state()).toEqual({ state: 'needs-rooms' });
	});

	test('returns ready when there is at least one room', () => {
		roomTypes.count.mockReturnValue(2);
		rooms.count.mockReturnValue(5);

		expect(underTest.state()).toEqual({ state: 'ready' });
	});

	test('returns unconfigured when there is no room type but the room count is not zero', () => {
		roomTypes.count.mockReturnValue(0);
		rooms.count.mockReturnValue(3);

		expect(underTest.state()).toEqual({ state: 'unconfigured' });
	});
});
