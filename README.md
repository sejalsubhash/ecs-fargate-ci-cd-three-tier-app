# Three-Tier Application — AWS ECS Fargate Deployment

> Register & Login application with React frontend, Node.js backend, and RDS MySQL database.  
> Fully containerized with Docker, deployed on AWS ECS Fargate, with automated CI/CD via CodePipeline.

---

## Architecture

```
Browser
  └── ALB (port 80)
        ├── /api/*  ──► Backend ECS Service  (Node.js :5000)  [Private Subnet]
        └── /*      ──► Frontend ECS Service (React+Nginx :80) [Public Subnet]
                              Backend ──► RDS MySQL :3306       [Private Subnet DB]
```

```
CI/CD:
  GitHub Push ──► CodePipeline ──► CodeBuild ──► ECR ──► ECS Rolling Deploy
```

---

## Project Structure

```
three-tier-app/
├── backend/
│   ├── server.js                  # Express entry point
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example               # Local env template
│   ├── routes/
│   │   └── auth.js                # POST /register, POST /login, GET /profile
│   ├── middleware/
│   │   └── auth.js                # JWT verification middleware
│   └── utils/
│       ├── db.js                  # MySQL connection pool + table creation
│       ├── secrets.js             # AWS Secrets Manager integration
│       └── logger.js              # Structured JSON logger for CloudWatch
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── index.js
│   │   ├── App.js                 # Page routing (login/register/dashboard)
│   │   ├── App.css
│   │   ├── api.js                 # Axios API client with JWT interceptor
│   │   └── components/
│   │       ├── Login.js
│   │       ├── Register.js
│   │       └── Dashboard.js       # Profile + users table + architecture info
│   ├── nginx.conf                 # Nginx with /api proxy + React SPA routing
│   ├── docker-entrypoint.sh       # Injects BACKEND_HOST at container start
│   ├── package.json
│   └── Dockerfile                 # Multi-stage: Node build → Nginx serve
├── database/
│   └── schema.sql                 # Users table + optional seed data
├── docker-compose.yml             # Local: MySQL + Backend + Frontend
├── buildspec.yml                  # CodeBuild pipeline spec
├── .github/workflows/deploy.yml   # GitHub Actions alternative
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Frontend health check |
| GET | `/api/auth/health` | No | Backend health check |
| POST | `/api/auth/register` | No | Create new account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/profile` | JWT | Get current user profile |
| GET | `/api/auth/users` | JWT | List all registered users |

**Register request body:**
```json
{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }
```

**Login request body:**
```json
{ "email": "john@example.com", "password": "secret123" }
```

**Auth response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" }
}
```

---

## Local Development

```bash
git clone https://github.com/YOUR_USERNAME/three-tier-app
cd three-tier-app

# Start all 3 tiers (MySQL + Backend + Frontend)
docker-compose up --build

# Frontend:  http://localhost
# Backend:   http://localhost:5000
# MySQL:     localhost:3306
```

> MySQL starts first, backend waits for it to be healthy, then frontend starts.

---

## AWS Deployment Guide

### Step 1 — Create RDS MySQL Instance

```
RDS → Create database
  Engine:          MySQL 8.0
  Template:        Free tier
  DB instance ID:  three-tier-db
  Username:        admin
  Password:        <save this>
  Instance:        db.t3.micro
  VPC:             same as ECS cluster
  Public access:   NO
  Security group:  db-sg (inbound port 3306 from backend-sg only)
  Database name:   appdb
```

### Step 2 — Store Credentials in Secrets Manager

```
Secrets Manager → Store a new secret
  Type:        Credentials for RDS database
  Username:    admin
  Password:    <your RDS password>
  Database:    three-tier-db
  Secret name: three-tier-db-secret
```

### Step 3 — Run Schema on RDS

```bash
# Connect to RDS (from EC2 or bastion in same VPC)
mysql -h <rds-endpoint> -u admin -p appdb < database/schema.sql
```

### Step 4 — Create ECR Repositories

```bash
export AWS_REGION=us-east-2
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr create-repository --repository-name three-tier-backend  --region $AWS_REGION
aws ecr create-repository --repository-name three-tier-frontend --region $AWS_REGION
```

### Step 5 — Build & Push Images

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Backend
docker build -t three-tier-backend ./backend
docker tag three-tier-backend:latest \
  $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/three-tier-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/three-tier-backend:latest

# Frontend
docker build -t three-tier-frontend ./frontend
docker tag three-tier-frontend:latest \
  $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/three-tier-frontend:latest
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/three-tier-frontend:latest
```

### Step 6 — ECS Setup

**Cluster:**
```
ECS → Clusters → Create → three-tier-cluster (Fargate)
```

**Backend Task Definition (backend-task):**
```
Launch type: Fargate | CPU: 0.5 vCPU | Memory: 1 GB
Container name: backend
Image: <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/three-tier-backend:latest
Port: 5000

Environment variables:
  NODE_ENV    = production
  PORT        = 5000
  DB_HOST     = <rds-endpoint>
  DB_NAME     = appdb
  DB_PORT     = 3306
  JWT_SECRET  = <your-strong-secret>
  SECRET_NAME = three-tier-db-secret
  AWS_REGION  = us-east-2

Secrets (from Secrets Manager):
  DB_PASSWORD = three-tier-db-secret:password

CloudWatch logs:
  Log group:  /ecs/three-tier-backend
```

**Frontend Task Definition (frontend-task):**
```
Launch type: Fargate | CPU: 0.25 vCPU | Memory: 512 MB
Container name: frontend
Image: <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/three-tier-frontend:latest
Port: 80

Environment variables:
  BACKEND_HOST = <ALB-DNS-name>

CloudWatch logs:
  Log group:  /ecs/three-tier-frontend
```

**ALB Setup:**
```
Name: three-tier-alb | Scheme: Internet-facing

Target groups:
  backend-tg:  Target type IP | Port 5000 | Health path /health
  frontend-tg: Target type IP | Port 80   | Health path /health

Listener rules (port 80):
  Priority 1: /api/* → backend-tg
  Default:    /*     → frontend-tg
```

**ECS Services:**
```
backend-service:
  Task: backend-task | Desired: 2
  ALB: three-tier-alb | Target group: backend-tg

frontend-service:
  Task: frontend-task | Desired: 2
  ALB: three-tier-alb | Target group: frontend-tg
```

### Step 7 — CI/CD Pipeline (CodePipeline)

```
Pipeline name: three-tier-pipeline

Stage 1 — Source:
  Provider: GitHub | Branch: main | Auto-trigger: on push

Stage 2 — Build:
  Provider: CodeBuild
  Project:  three-tier-build (Privileged mode ON)

Stage 3 — Deploy:
  Action 1: deploy-backend  → ECS backend-service  | imagedefinitions_backend.json
  Action 2: deploy-frontend → ECS frontend-service | imagedefinitions_frontend.json
```

**CodeBuild environment variables:**

| Variable | Value |
|---|---|
| AWS_ACCOUNT_ID | your-account-id |
| AWS_DEFAULT_REGION | us-east-2 |
| FRONTEND_REPO_NAME | three-tier-frontend |
| BACKEND_REPO_NAME | three-tier-backend |
| ECS_CLUSTER_NAME | three-tier-cluster |
| FRONTEND_SERVICE_NAME | frontend-service |
| BACKEND_SERVICE_NAME | backend-service |
| FRONTEND_TASK_DEF | frontend-task |
| BACKEND_TASK_DEF | backend-task |

---

## Environment Variables

**Backend (ECS Task Definition):**

| Variable | Description | Source |
|---|---|---|
| NODE_ENV | `production` | Plaintext |
| PORT | `5000` | Plaintext |
| DB_HOST | RDS endpoint | Plaintext |
| DB_NAME | `appdb` | Plaintext |
| DB_PORT | `3306` | Plaintext |
| DB_PASSWORD | RDS password | Secrets Manager |
| JWT_SECRET | JWT signing key | Plaintext / Secrets Manager |
| SECRET_NAME | `three-tier-db-secret` | Plaintext |
| AWS_REGION | `us-east-2` | Plaintext |

**Frontend (ECS Task Definition):**

| Variable | Description |
|---|---|
| BACKEND_HOST | ALB DNS name — used by Nginx to proxy /api |

---

## Security Groups

```
alb-sg:
  Inbound:  80 from 0.0.0.0/0

frontend-sg:
  Inbound:  80 from alb-sg

backend-sg:
  Inbound:  5000 from alb-sg

db-sg:
  Inbound:  3306 from backend-sg only ← DB never directly accessible
```

---

## IAM Permissions Required

**CodeBuild role:**
- `AmazonEC2ContainerRegistryFullAccess`
- `AmazonECS_FullAccess`
- `SecretsManagerReadWrite`
- Inline: `codeconnections:UseConnection`, `s3:PutObject`

**ECS Task role (backend):**
- `SecretsManagerReadWrite` — to fetch DB password at startup
- `CloudWatchLogsFullAccess`

---

## Verify Deployment

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names three-tier-alb \
  --query 'LoadBalancers[0].DNSName' --output text)

curl http://$ALB_DNS/health           # Frontend health
curl http://$ALB_DNS/api/auth/health  # Backend health (via ALB routing)

# Register a user
curl -X POST http://$ALB_DNS/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test@123"}'

# Login
curl -X POST http://$ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'
```

---

## CloudWatch Logs

```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/three-tier-backend
aws logs create-log-group --log-group-name /ecs/three-tier-frontend

# Watch live logs
aws logs tail /ecs/three-tier-backend  --follow
aws logs tail /ecs/three-tier-frontend --follow
```

Logs are structured JSON — query them with CloudWatch Logs Insights:
```
fields @timestamp, message, level
| filter service = "three-tier-backend"
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Backend can't connect to RDS | Check db-sg allows port 3306 from backend-sg |
| Secrets Manager access denied | Add SecretsManagerReadWrite to ECS task role |
| DB_PASSWORD undefined | Set SECRET_NAME env var and ensure task role has Secrets access |
| Frontend shows blank page | React build failed in Docker — check `npm run build` output |
| JWT token invalid | Ensure JWT_SECRET is identical in all backend tasks |
| Docker Hub rate limit | Dockerfiles use `public.ecr.aws` — no rate limit |
| Target group unhealthy | Recreate with Target type: IP (required for Fargate) |

---

## Differences from 2-Tier Project

| Aspect | 2-Tier | 3-Tier |
|---|---|---|
| Tiers | Frontend + Backend | Frontend + Backend + RDS |
| Data storage | In-memory | MySQL on RDS |
| Authentication | None | JWT (register + login) |
| Frontend | Plain HTML | React (multi-page) |
| Secrets | None | AWS Secrets Manager |
| Security Groups | 2 | 3 (+ db-sg) |
| Subnets | Public only | Public + Private + DB |
| Docker Compose | MySQL not needed | MySQL service included |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Nginx |
| Backend | Node.js + Express + JWT |
| Database | Amazon RDS MySQL 8.0 |
| Auth | bcryptjs + jsonwebtoken |
| Containerization | Docker (multi-stage builds) |
| Registry | Amazon ECR (2 repos) |
| Orchestration | Amazon ECS Fargate |
| Load Balancer | AWS ALB (path-based routing) |
| CI/CD | AWS CodePipeline + CodeBuild |
| Secrets | AWS Secrets Manager |
| Logs | Amazon CloudWatch |
| Network | AWS VPC (public + private subnets) |
