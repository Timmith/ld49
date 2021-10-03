const HOST = "https://pillars.attente.ca";

export interface Leader {
	place: number;
	id: number;
	score: number;
	summary: string;
	createdAt: string;
}

export interface Result {
	score: number;
	summary: string;
	details: string;
}

export async function getLeaders(limit?: number, offset?: number): Promise<Leader[]> {
	const request =
		offset === undefined
			? limit === undefined
				? `${HOST}/leaders`
				: `${HOST}/leaders?limit=${limit}`
			: limit === undefined
			? `${HOST}/leaders?offset=${offset}`
			: `${HOST}/leaders?offset=${offset}&limit=${limit}`;

	const response = await fetch(request);
	return response.json();
}

export async function getDetails(id: number): Promise<string> {
	const response = await fetch(`${HOST}/details?id=${id}`);
	const json = await response.json();
	return json.details;
}

export function record(result: Result): Promise<Response> {
	return fetch(`${HOST}/record`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result)
	});
}
