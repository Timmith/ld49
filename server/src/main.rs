const ORIGIN: &str = "*";
const LISTEN: &str = "0.0.0.0:8080";
const DATABASE: &str = "postgres://postgres@0.0.0.0/pillars";

#[async_std::main]
async fn main() -> tide::Result<()> {
    let mut app = tide::new();

    let pool = sqlx::PgPool::connect(DATABASE).await?;

    app.at("/leaders").get({
        let pool = pool.clone();
        move |request| leaders(pool.clone(), request)
    });

    app.at("/details").get({
        let pool = pool.clone();
        move |request| details(pool.clone(), request)
    });

    app.at("/record").options(record_options);

    app.at("/record").post({
        let pool = pool.clone();
        move |request| record(pool.clone(), request)
    });

    app.listen(LISTEN).await?;

    Ok(())
}

#[derive(serde::Deserialize)]
struct LeadersRequest {
    offset: Option<u32>,
    limit: Option<u32>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Leader {
    place: u32,
    id: u32,
    score: i32,
    summary: String,
    created_at: String,
}

async fn leaders(pool: sqlx::PgPool, request: tide::Request<()>) -> tide::Result {
    let LeadersRequest { offset, limit } = request.query()?;

    let results = sqlx::query!(
        "SELECT id, score, summary, created_at FROM leaderboard ORDER BY score DESC, created_at ASC LIMIT $1 OFFSET $2",
        limit.map(|limit| limit as i64),
        offset.map(|offset| offset as i64),
    )
    .fetch_all(&pool)
    .await?;

    Ok(tide::Response::builder(tide::StatusCode::Ok)
        .header("Access-Control-Allow-Origin", ORIGIN)
        .header("Access-Control-Allow-Methods", "GET")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .content_type(tide::http::mime::JSON)
        .body(tide::Body::from_json(
            &results
                .into_iter()
                .enumerate()
                .map(|(i, result)| Leader {
                    place: offset.unwrap_or(0) + i as u32,
                    id: result.id as u32,
                    score: result.score,
                    summary: result.summary,
                    created_at: result.created_at.to_string(),
                })
                .collect::<Vec<_>>(),
        )?)
        .build())
}

#[derive(serde::Deserialize)]
struct DetailsRequest {
    id: u32,
}

#[derive(serde::Serialize)]
struct Details {
    details: String,
}

async fn details(pool: sqlx::PgPool, request: tide::Request<()>) -> tide::Result {
    let DetailsRequest { id } = request.query()?;

    let result = sqlx::query!("SELECT details FROM leaderboard WHERE id = $1", id as i32)
        .fetch_one(&pool)
        .await;

    match result {
        Ok(result) => Ok(tide::Response::builder(tide::StatusCode::Ok)
            .header("Access-Control-Allow-Origin", ORIGIN)
            .header("Access-Control-Allow-Methods", "GET")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .content_type(tide::http::mime::JSON)
            .body(tide::Body::from_json(&Details {
                details: result.details,
            })?)
            .build()),

        Err(_) => Ok(tide::Response::builder(tide::StatusCode::NotFound)
            .header("Access-Control-Allow-Origin", ORIGIN)
            .header("Access-Control-Allow-Methods", "GET")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .build()),
    }
}

async fn record_options(_: tide::Request<()>) -> tide::Result {
    Ok(tide::Response::builder(tide::StatusCode::Ok)
        .header("Access-Control-Allow-Origin", ORIGIN)
        .header("Access-Control-Allow-Methods", "OPTIONS, POST")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .build())
}

#[derive(serde::Deserialize)]
struct RecordRequest {
    score: i32,
    summary: String,
    details: String,
}

async fn record(pool: sqlx::PgPool, mut request: tide::Request<()>) -> tide::Result {
    let request: RecordRequest = request.body_json().await?;

    sqlx::query!(
        "INSERT INTO leaderboard (score, summary, details, created_at) VALUES ($1, $2, $3, $4)",
        request.score,
        request.summary,
        request.details,
        sqlx::types::time::PrimitiveDateTime::now(),
    )
    .execute(&pool)
    .await?;

    Ok(tide::Response::builder(tide::StatusCode::Ok)
        .header("Access-Control-Allow-Origin", ORIGIN)
        .header("Access-Control-Allow-Methods", "GET")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .build())
}
