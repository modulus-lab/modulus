# Modulus - Supercharge your mocks

Modulus is mocking on steroids. It is a powerful tool designed to solve the problem of test data,
static users and mocking complex user journeys. 

With Modulus, you can create dynamic mocks that can be easily configured and managed. It allows you to
simulate real-world scenarios, making it easier to test and develop applications. It provides you with a 
permutation and combination of responses across chained APIs, enabling you to create complex user journeys with ease.

## Features
Modulus is currently in active development, and we are continuously adding new features to enhance its capabilities. 
Some of the key features include:

- Dynamic Mocking: Create dynamic mocks that can be easily configured and managed.
- API Chaining: Simulate complex user journeys by chaining multiple APIs together.
- Real-world Scenarios: Test and develop applications in a simulated environment that mimics real-world
- HTTP Methods Support: Supports various HTTP methods including GET, POST, PUT, DELETE, etc.
- Easy Configuration: Simple and intuitive configuration options for setting up mocks.

## Getting Started
To get started with Modulus, follow these steps:
1. Clone the repository:
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your mocks using the provided configuration options.
4. Start the Modulus server:
   ```bash
   npm run dev
    ```
Modulus is now ready to use! You can start creating dynamic mocks and simulating complex user journeys.
Go to: http://localhost:3000 to access the Modulus dashboard.

## Configuring Mocks

Mocks are organized in the `/mocks` directory. Each mock service is a folder containing an `index.json` configuration file and one or more response files.

### Mock Structure

Each mock folder follows this pattern:
```
mocks/
├── my-service/
│   ├── index.json
│   ├── success.json
│   ├── error.json
│   └── ...other responses
```

### index.json Configuration

The `index.json` file defines the API endpoint and how responses are selected. Here's an example:

```json
{
  "name": "Change Number",
  "desc": "API to Change Number",
  "defaultResponse": "success",
  "method": "post",
  "path": "/v1/api/test/change",
  "uniqueKey": {
    "target": "body",
    "modifier": "mobileNumber",
    "type": "mobileNumber"
  }
}
```

**Configuration Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the mock API |
| `desc` | string | Description of what the API does |
| `method` | string | HTTP method: `get`, `post`, `put`, `delete`, etc. |
| `path` | string | API endpoint path that will be mocked |
| `defaultResponse` | string | Default response file to use (without `.json` extension) |
| `uniqueKey` | object | Configuration for selective response routing based on request data |
| `uniqueKey.target` | string | Where to look for the identifier: `body`, `query`, or `header` |
| `uniqueKey.modifier` | string | The field name to extract from the target |
| `uniqueKey.type` | string | The type of identifier (e.g., `mobileNumber`, `userId`, `email`) |

### Response Files

Response files contain the actual JSON responses that will be returned by the mocked API. Each file is named based on its scenario (e.g., `success.json`, `error.json`).

**Example success.json:**
```json
{
  "statusCode": 200,
  "message": "Number changed successfully",
  "data": {
    "mobileNumber": "+1234567890",
    "status": "active"
  }
}
```

**Example error.json:**
```json
{
  "statusCode": 400,
  "message": "Invalid mobile number format",
  "error": "INVALID_INPUT"
}
```
