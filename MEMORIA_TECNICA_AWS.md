# Technical Documentation: AWS Deployment

## 1. Introduction

This project implements the deployment of the UrbanSpot web application, composed of a **backend service (API)** and a **frontend service**, both encapsulated in Docker containers and deployed on **Amazon Elastic Container Service (ECS) with Fargate**. The main objective was to build a modular, scalable architecture aligned with AWS best practices, staying within **Free Tier** limitations. The final architecture allows each service to be independent, scalable, and publicly accessible through its own **Application Load Balancer**, ensuring separation of responsibilities, ease of maintenance, and complete observability through **CloudWatch**.

## 2. Docker Image Preparation

The process begins in the local development environment. Both the backend and frontend are packaged as independent Docker images. Each service has its own `Dockerfile`, designed to expose the corresponding port and start the service autonomously. Before proceeding with deployment, images are validated locally to ensure services work correctly, verifying that each service starts properly in the local environment and listens on the appropriate port (for example, the backend on port 8000 and the frontend on port 80 with Nginx).

The workflow for Docker image preparation is as follows:

* Backend Docker image construction from source code.
* Frontend Docker image construction, including dynamic configuration of the backend URL through environment variables. The frontend uses Nginx as a web server, listening on port 80.
* Local verification of each container's operation using `docker run`.

## 3. Publication to Amazon ECR

Once validated, images are published to **Amazon Elastic Container Registry (ECR)**. The following steps are performed:

* Creation of an independent ECR repository for each service:

  * One repository for the backend.
  * One repository for the frontend.
  
  This separation allows versioning and managing backend and frontend images independently, facilitating deployment and updating of each component separately.

* Authentication against ECR using AWS CLI through the `aws ecr get-login-password` command. This command generates the temporary credentials necessary to authenticate against the registry.
* Tagging of local images with the corresponding repository URI.
* Push of images to ECR, leaving images securely stored and ready for deployment in ECS.

## 4. Amazon ECS Configuration with Fargate

With images already stored in ECR, the configuration of the execution infrastructure in AWS begins. **Amazon ECS in Fargate mode** is used, which eliminates the need to manage EC2 servers and simplifies operations, allowing a fully managed deployment without concerns about underlying infrastructure maintenance.

### 4.1. Task Definitions

A **Task Definition** is defined for each service, which includes:

* Container image stored in ECR.
* Port exposed by the container:

  * Backend: port 8000.
  * Frontend: port 80.

* Resource allocation: 1 CPU in each case with 2GB of memory

* Required environment variables.

* Logging configuration: sending logs to Amazon CloudWatch Logs.

### 4.2. ECS Cluster and Services

Once tasks are defined, an **ECS Cluster** is created, which acts as a logical container for services. Two independent **Services** are deployed on this cluster, one for the backend and another for the frontend. Each service is configured with the following characteristics:

* REPLICA execution strategy.
* Desired number of tasks (initially 1).
* Use of public subnets within the VPC.
* Automatic public IP assignment.
* Association with its corresponding Application Load Balancer.

## 5. Application Load Balancers

For public exposure of services, **independent Application Load Balancers** are created, one for the backend and another for the frontend. This decision simplifies the architecture, avoids complex path-based routing rule configurations, and allows clear isolation between frontend and backend, facilitating independent operation, debugging, and maintenance of each service.

### 5.1. ALB Configuration

Each ALB configuration includes:

* Type: Application Load Balancer.
* Scheme: Internet-facing.
* HTTP listener on port 80.
* Association with two public subnets for high availability.

### 5.2. Target Groups

Each ALB is linked to its own **Target Group**, specifically configured for Fargate:

* Target type: IP.
* HTTP protocol.
* Port:
  * Backend: 8000.
  * Frontend: 80.
* Health check configuration:

  * Path:
    * Backend: `/health`
    * Frontend: `/`
  * Protocol: HTTP
  * Valid codes: 200–399. These codes are accepted to avoid false negatives in case of HTTP redirects, allowing the load balancer to correctly determine if tasks are healthy.
  * Standard interval and timeout.

ECS services are linked to their respective target groups during service creation, allowing tasks to automatically register as active targets of the load balancer.

The **Health Check Grace Period** was also configured in ECS services, allowing containers sufficient time to start before the load balancer begins marking them as unhealthy. This was key to avoiding premature and unnecessary task restarts.

## 6. Security: Security Groups

Architecture security is implemented through **Security Groups**, carefully configured to allow only necessary traffic and following a security model based on least privilege. The final configuration includes:

* ALB Security Group: allows incoming HTTP traffic (port 80) from any origin (0.0.0.0/0), necessary for users to access services from the Internet.

* ECS task Security Group: allows incoming traffic only from the corresponding ALB Security Group. This configuration is key for health checks to function correctly and to maintain task isolation, which can only receive traffic through the load balancer.

* Outbound traffic allowed to the Internet to enable downloads and external calls.

The correct configuration of security groups and the Application Load Balancer (ALB) represented one of the main challenges of the deployment. This security configuration is fundamental for system operation, as errors or incomplete rules in security groups, or an incorrect association with the ALB, were the initial cause of problems such as 503 responses and health check failures. Only after properly adjusting both security groups and the ALB was effective communication between the load balancer and ECS tasks achieved, resolving these critical access and service health problems.

## 7. Service Access

Once services are deployed and targets are in healthy state, service access is performed directly through **public DNS provided by ALBs**, of the type `*.elb.amazonaws.com`, for example:

* Frontend: `http://alb-frontend-1023875312.eu-north-1.elb.amazonaws.com/login`
* Backend: `http://alb-urbanspot-1565806334.eu-north-1.elb.amazonaws.com/docs`

Due to **Free Tier** limitations, it was not possible to use Amazon Route 53 for custom domain management. For this reason, AWS native DNS was chosen as the access point for both frontend and backend, which required rethinking application access through these public DNS instead of custom domains.

## 8. Observability with CloudWatch

Regarding observability, the entire application is integrated with **Amazon CloudWatch Logs**. All containers are configured to automatically send their logs and can be consulted from the ECS console or directly from CloudWatch Logs. From the ECS console, it is possible to access logs from each service and each task, which allows:

* Verifying correct container startup (from Nginx startup in the frontend to API initialization in the backend).
* Detecting configuration errors.
* Confirming correct injection of environment variables and that they are being applied correctly.
* Having complete traceability of the deployment and execution process.

## 9. Problems Encountered and Solutions

* Initial health check failures, caused by:

  * Incorrectly configured ports in containers or target groups.
  * Incorrect health check paths that did not correspond to valid endpoints.
  * Incomplete or incorrect security rules between the ALB and ECS tasks, which prevented communication and generated 503 states.
* Errors when attempting to reuse a single ALB for multiple services without adequate routing rules, which complicated configuration and generated routing problems.

These problems were resolved through:

* Detailed review of ports exposed by containers and their correspondence with ports configured in target groups.
* Adjustment of health checks to valid endpoints and adequate configuration of accepted response codes.
* Correction of security groups to allow ALB → ECS traffic, ensuring that the task security group allows traffic from the ALB security group.
* Decision to use an independent ALB per service, significantly simplifying deployment and avoiding the complexity of multiple routing rules.

## 10. Code Modifications to Use DynamoDB

To use Amazon DynamoDB as a database instead of MongoDB, a new `DynamoDBDataDB` class has been implemented that implements the `DataDB` protocol, allowing switching between both implementations through an environment variable. This section documents the necessary steps to configure and use DynamoDB from the backend.

### 10.1. AWS Configuration

#### 10.1.1. Creating Tables in DynamoDB

The table creation process in DynamoDB involves the following steps:

1. Access the AWS console and navigate to the **DynamoDB** service.
2. Click on **"Create table"**.
3. Configure the table with the following parameters:
   * **Table name**: `urbanspot-users` (or the preferred name with the configured prefix)
   * **Partition key**: `_id` (type: String)
   * **Table settings**: Select **"Customize settings"** for greater control
   * **Billing mode**: Select **"On-demand"** (compatible with Free Tier and pay-per-use)
4. Click on **"Create table"**.

**Note**: The implementation automatically creates tables when needed. However, it is recommended to create main tables manually to have control over the configuration.

#### 10.1.2. Configuring IAM Permissions

For the backend to access DynamoDB, appropriate permissions must be configured. Since the application will perform read, create, and modify table operations, the **AmazonDynamoDBFullAccess** permission must be assigned to the Amazon profile or user being used. This can be done through:

* **Task Role** (if using ECS): Assign the permission to the IAM role associated with the Task Definition.
* **IAM User** (if running locally or with explicit credentials): Assign the permission directly to the user.

### 10.2. Configuring Environment Variables

To activate DynamoDB usage in the backend, the following environment variables must be configured:

```bash
# Select database: "mongodb" or "dynamodb"
DATABASE_TYPE=dynamodb

# Optional prefix for tables (default: "urbanspot")
DYNAMODB_TABLE_PREFIX=urbanspot
```

**Note**: If using ECS with Task Roles, it is not necessary to configure `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`, as AWS automatically manages temporary credentials. If running locally or if explicit credentials are required, these variables must also be added.

### 10.3. Switching between MongoDB and DynamoDB

To switch between MongoDB and DynamoDB, the `DATABASE_TYPE` environment variable is simply modified:

* `DATABASE_TYPE=mongodb` → Uses MongoDB (requires `MONGODB_URI` and `MONGODB_DATABASE`)
* `DATABASE_TYPE=dynamodb` → Uses DynamoDB (requires AWS permissions and `AWS_REGION`)

The backend automatically detects which implementation to use on startup.

### 10.4. Important Considerations

**Differences between MongoDB and DynamoDB:**

* **Indexes**: DynamoDB requires defining global secondary indexes (GSI) for efficient queries on fields that are not the primary key. The current implementation uses `scan` for non-primary queries, which can be costly in large tables.

* **Aggregations**: DynamoDB does not have native support for complex aggregations like MongoDB. The current implementation provides a simplified version.

* **Scalability**: DynamoDB scales automatically, but "On-demand" mode can be more expensive than provisioned mode for predictable workloads.

* **Region**: The region configured in `AWS_REGION` must match the region where the DynamoDB table was created to minimize latency.

## 11. Conclusion

As a final result, a stable and functional deployment on AWS has been achieved, with a clear, modular architecture aligned with container and microservices best practices. A functional architecture has been achieved in which the frontend and backend are deployed independently, each with its own lifecycle, load balancer, and monitoring system. Each application component is independent, observable, and easily scalable. The complete workflow, from local Docker image construction to public application exposure, is properly documented and reproducible, ensuring a clean, scalable deployment aligned with AWS best practices within Free Tier limitations.
