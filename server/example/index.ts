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

window.addEventListener("load", () => {
	document.getElementById("leadersButton")!.addEventListener("click", async () => {
		const offsetValue = (document.getElementById("leadersOffset") as HTMLInputElement).value;
		const limitValue = (document.getElementById("leadersLimit") as HTMLInputElement).value;

		let offset: number | undefined;
		if (offsetValue !== "") {
			offset = parseInt(offsetValue, 0);
		}

		let limit: number | undefined;
		if (limitValue !== "") {
			limit = parseInt(limitValue, 0);
		}

		const leaders = await getLeaders(limit, offset);
		(document.getElementById("leadersResponse") as HTMLTextAreaElement).value = JSON.stringify(
			leaders,
			undefined,
			2
		);
	});

	document.getElementById("detailsButton")!.addEventListener("click", async () => {
		const idValue = (document.getElementById("detailsId") as HTMLInputElement).value;

		if (idValue !== "") {
			const details = await getDetails(+idValue);
			(document.getElementById("detailsResponse") as HTMLTextAreaElement).value = details;
		}
	});

	document.getElementById("recordButton")!.addEventListener("click", () => {
		const scoreValue = (document.getElementById("recordScore") as HTMLInputElement).value;
		const summaryValue = (document.getElementById("recordSummary") as HTMLInputElement).value;
		const detailsValue = (document.getElementById("recordDetails") as HTMLTextAreaElement).value;

		record({
			score: +scoreValue,
			summary: summaryValue,
			details: detailsValue
		});
	});
});
