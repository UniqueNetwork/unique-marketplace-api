<h1 align="center">Unique Marketplace Backend</h1>

<div align="center">
  <a href="https://nestjs.com" target="_blank">
    <img src="https://img.shields.io/badge/built%20with-NestJs-red.svg" alt="Built with NestJS">
  </a>
</div>

## Who is this document for:

- Full stack engineers
- IT administrators

> In this tutorial we will install the marketplace backend locally on a computer or in a virtual machine with Ubuntu OS.

## Prerequisites

- OS: Ubuntu 18.04 or 20.04
- docker CE 20.10 or up
- docker-compose 1.25 or up
- git

**Warning**:  You are encouraged to change the insecure default credentials and check out the available configuration options in the [Environment Variables](#environmentvariables) section for a more secure deployment.

## How to use

Marketplace Backend is divided into 3 containers: `marketplace-api` which is the main REST API and
two auxiliary workers `marketplace-escrow-unique` and `marketplace-escrow-kusama` which requires access to a PostgreSQL database to store information. This assembly can be built using [Unique-Marketplace-Api GitHub Repository](https:github.comUniqueNetworkunique-marketplace-api.git) or take images [UniqueNetwork Docker Hub Image](https:hub.docker.comruniquenetworkmarketplace-backend) with instructions for deployment.

### Run the application using Docker Compose

The main folder of this repository contains a functional [`docker-compose.example.yml`](https://github.com/UniqueNetwork/unique-marketplace-api/blob/release/v1.0/docker-compose.example.yml) file.
All settings based on env variables and listed in `docker-compose.example.yml` file. You can create your own `docker-compose.yml` file based on example, change settings and run service.

Run the application using it as shown below:

```shell
$ git clone https://github.com/UniqueNetwork/unique-marketplace-api.git
$ cd unique-marketplace-api && git checkout release/v1.0
```
### Using the Docker Command Line

If you want to run the application manually instead of using `docker-compose`, these are the basic steps you need to run:

#### Step 1: Setup the environment

```shell
$ cp docker-compose.example.yml  docker-compose.yml
```

```shell
$ vi docker-compose.yml
```
or

```shell
$ nano docker-compose.yml
```

 - Edit the `docker-compose.yml` file and specify all settings for the environment, except for the two items `CONTRACT_ETH_OWNER_SEED` and `CONTRACT_ADDRESS` - we will get this data in step 4.
 - Change ESCROW_SEED to the 12-word admin mnemonic seed phrase that you have saved when you created the admin address in Polkadot{.js} extension.
 - Carefully review all settings for the environment and follow the instructions.


#### Step 2: Start the main container

```shell
$ docker-compose up -d  marketplace-api
```

#### Step 3: Migration database

```shell
$ docker exec marketplace-api node dist/cli.js playground migrate_db
```

#### Step 4: Deploy Smart Contract

```shell
$ docker exec marketplace-api node dist/cli.js playground deploy_contract
```
In a few minutes you will see in the terminal something like that:

```shell
...

SUMMARY:

CONTRACT_ETH_OWNER_SEED: '0x6d853337ab45b20aa5231c33979330e2806465fb4ab...'
CONTRACT_ADDRESS: '0x74C2d83b868f7E7B7C02B7D0b87C3532a06f392c'
```

#### Step 5: Add smart contract data to `docker-compose.yml`

```yaml
   ...
   UNIQUE_WS_ENDPOINT: 'wss://opal.unique.network'
   UNIQUE_NETWORK: 'opal'
   UNIQUE_START_FROM_BLOCK: 'current'
#    CONTRACT_ETH_OWNER_SEED: 'Get by running "npm run playground deploy_contract"'
#    CONTRACT_ADDRESS: 'Get by running "npm run playground deploy_contract"'
   UNIQUE_COLLECTION_IDS: '1, 2, 3'
   ...
```
> CONTRACT_ETH_OWNER_SEED - long token, dots added at the end as an example

 change to:
```yaml
   ...
   UNIQUE_WS_ENDPOINT: 'wss://opal.unique.network'
   UNIQUE_NETWORK: 'opal'
   UNIQUE_START_FROM_BLOCK: 'current'
   CONTRACT_ETH_OWNER_SEED: '0x6d853337ab45b20aa5231c33979330e2806465fb4ab...'
   CONTRACT_ADDRESS: '0x74C2d83b868f7E7B7C02B7D0b87C3532a06f392c'
   UNIQUE_COLLECTION_IDS: '1, 2, 3'
   ...
```
#### Step 6: Start all containers

```shell
$ docker-compose up -d
```
#### Step 7: Сheck installation

You can check your installation by running:

```shell
$ docker exec marketplace-api node dist/cli.js playground check_config
```


### Check running application

```shell
$ curl -X 'GET' \
  'http://localhost:5000/api/system/health' \
  -H 'accept: */*'
```
Response JSON:

```json
{
  "status": "ok",
  "info": {
    "App": {
      "status": "up"
    },
    "OffersHealthIndicator": {
      "status": "up"
    },
    "TradesHealthIndicator": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "App": {
      "status": "up"
    },
    "OffersHealthIndicator": {
      "status": "up"
    },
    "TradesHealthIndicator": {
      "status": "up"
    }
  }
}
```
### Swagger Api
```shell
 http://localhost:5000/api/docs  or  https://youdomain.com/api/docs
```

## Configuration
<hr>


### Environment variables

When you start the UniqueNetwork Marketplace Backend container, you can adjust the configuration of the instance by passing one or more environment variables either on the docker-compose file or on the `docker run` command line.
If you want to add a new environment variable:

### Running database migrations

Migrations can start automatically by setting AUTO_DB_MIGRATIONS env to true, or you can run npm run playground migrate_db to start migrations manually (highly recommended)

- For docker-compose add the variable name and value under the application section in the [`docker-compose.yml`](https://github.com/UniqueNetwork/unique-marketplace-api/blob/release/v1.0/docker-compose.hub.yml) file present in this repository:

```yaml
...
    x-marketplace: &marketplace-backend
    ...
    environment:
      POSTGRES_URL: 'postgres://marketplace:12345@marketplace-postgres:5432/marketplace_db'
      API_PORT: '5000'
      DISABLE_SECURITY: 'false'
      ...
```
```yaml
...
  marketplace-postgres:
      ...
    environment:
      POSTGRES_DB: 'marketplace_db'
      POSTGRES_USER: 'marketplace'
      POSTGRES_PASSWORD: '12345'
      ...
```


Available environment variables:

##### General configuration

- `POSTGRES_URL`: 'postgres://marketplace:12345@marketplace-postgres:5432/marketplace_db'
- `API_PORT`: '5000'
- `DISABLE_SECURITY`: 'false'
- `ESCROW_SEED`: '//Alice'
- `UNIQUE_WS_ENDPOINT`: 'wss://opal.unique.network'
- `UNIQUE_NETWORK`: 'opal'
- `UNIQUE_START_FROM_BLOCK`: 'current'
- `CONTRACT_ETH_OWNER_SEED`: 'Get by running "npm run playground deploy_contract"'
- `CONTRACT_ADDRESS`: 'Get by running "npm run playground deploy_contract"'
- `UNIQUE_COLLECTION_IDS`: '1, 2, 3'
- `KUSAMA_WS_ENDPOINT`: 'wss://ws-relay-opal.unique.network'
- `KUSAMA_NETWORK`: 'private_ksm'
- `KUSAMA_START_FROM_BLOCK`: 'current'
- `COMMISSION_PERCENT`: '10'
- `AUTO_DB_MIGRATIONS`: 'false'
- `SENTRY_ENABLED`: 'false'
- `SENTRY_ENV`: 'production'
- `SENTRY_DSN`: 'https://hash@domain.tld/sentryId'


##### Database connection configuration

- `POSTGRES_DB`: 'marketplace_db'
- `POSTGRES_USER`: 'marketplace'
- `POSTGRES_PASSWORD`: '12345'
- `POSTGRES_PORT`: '5432'
- `POSTGRES_INITDB_ARGS`: "--auth-local=trust"


## Additional settings
<hr>

### Prometheus metric connection

[Prometheus](https://prometheus.io/docs/introduction/overview/) collects and stores its metrics as time series data, i.e. metrics information is stored with the timestamp at which it was recorded, alongside optional key-value pairs called labels.


<details><summary> <h3>Running a container with Prometheus (expand)</h3> </summary>


#### Step 1: Get `docker-compose.prometheus.yml`

```shell
$ curl -sSL https://raw.githubusercontent.com/UniqueNetwork/unique-marketplace-api/release/v1.0/docker-compose.prometheus.yml > docker-compose.prometheus.yml
```

#### Step 2: Run docker-compose

```shell
$ docker-compose -f docker-compose.prometheus.yml up -d
```

#### Step 3: Открыть в браузере

Local configuration

> http://localhost:9090/metrics

In case you configured it via Nginx

> https://youdomain.com/metrics


### Using the expression browser
Let us try looking at some data that Prometheus has collected about itself. To use Prometheus's built-in expression browser, navigate to http://localhost:9090/graph and choose the "Table" view within the "Graph" tab.
As you can gather from http://localhost:9090/metrics, one metric that Prometheus exports about itself is called promhttp_metric_handler_requests_total (the total number of /metrics requests the Prometheus server has served). Go ahead and enter this into the expression console:

</details>


## License

Copyright &copy; 2022 UniqueNetwork

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
