# MongoDB Web Project Playground

## Installation

This project was tested on Node.js versio 22.4.x. You're welcome to try it on any other 

```shell
npm i
```

## Configuration

```shell
cat <<EOF > .env
PORT=3000
MONGODB_URI="<YOUR_MONGODB_CONNECTION_STRING>"
PRODUCTION=0
LOG_LEVEL=info
ATLAS_API_BASE_URI=https://cloud.mongodb.com/api/atlas/v2/groups/<PROJECT_ID>/clusters/<CLUSTER_NAME>/
ATLAS_PUBLIC_KEY=<ATLAS_PROJECT_API_PUB_KEY>
ATLAS_PRIVATE_KEY=<ATLAS_PROJECT_API_PVT_KEY>
EOF
```

## Run the web service

Run a development server with a change listener (nodemon):

```shell
npm run dev 
```

Build and run the project

```shell
npm run build
npm run start
```

Build and run in cluster mode:

```shell
npm run build
npm run prod
```

## Migrations

Create a migration in the following way:

```shell
npm run build-and-generate-migration --name=<short name>
```

This will create a new migration file under `./src/migrations/`.  If you named your migration "JIRA-214", you should see
a log entry along the following one:

```json
{
  "level":"info",
  "message":"Migration successfully written to /workspace/mdb-playground/src/migrations/m-20240726T083627-66a3600b6b350f3ede3d0010-JIRA-214.ts. Edit this TS file to implement the migration",
  "pid":"53697",
  "timestamp":"2024-07-26T08:36:27.776Z"
}
```

Once you finished your migration file (or files), you can apply it in the following way: 

```shell
npm run build-and-migration
```

This project contains a couple of sample migrations - you can try them out.
