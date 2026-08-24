# Exercise 01: Enrich the health response

Your API currently returns:

```json
{"status": "ok"}
```

Change `GET /health` so it also identifies the service:

```json
{"status": "ok", "service": "devstash-api"}
```

## Requirements

1. Add a typed `service` field to `HealthResponse`.
2. Update `health_check()` to return the new value.
3. Update the existing test to assert the complete response body.
4. Run all four quality checks from the README.

Do not return a plain dictionary for this exercise. Construct a `HealthResponse`
instance so Python and Pydantic can check your data as early as possible.

## Hints

- A normal string field is annotated as `service: str`.
- The model constructor must receive a value for every required field.
- When the test fails, compare its expected dictionary with the actual response.

## Stretch goal

Restrict `service` to the one allowed literal value, just as `status` is restricted.

