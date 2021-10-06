export async function delay(durationMs: number) {
	return new Promise(resolve => setTimeout(resolve, durationMs));
}
