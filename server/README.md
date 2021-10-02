# server

## migrate database

```
sqlx migrate run -D postgres://postgres@localhost/pillars
```

## run

```
DATABASE_URL=postgres://postgres@localhost/pillars cargo run
```
