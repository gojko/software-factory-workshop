export function pricePerNightCents(roomType, guests) {
	return roomType.baseRateCents + roomType.extraGuestCents * (guests - 1);
}

export function totalPriceCents(roomType, guests, stayLength) {
	return pricePerNightCents(roomType, guests) * stayLength.nights;
}
