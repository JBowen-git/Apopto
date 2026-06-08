# Case Study Workflows To Show

This document lists the important infrastructure workflows worth showing in the
case study UI. The JSON resource documents describe the nodes. This document
describes the stories those nodes should tell.

## Public Storefront Load

Flow:

```text
Visitor -> Cloudflare -> CloudFront -> S3 site bucket
```

Show this to explain how the public website is delivered. Cloudflare owns DNS,
CloudFront is the public edge, and the private S3 bucket stores the deployed
frontend files.

Useful nodes:

- Cloudflare
- CloudFront
- `ironwallengraving-site`
- `PolicyForCloudFrontPrivateContent`

## Public Catalog And Content Reads

Flow:

```text
Visitor -> CloudFront /api/* -> HTTP API Gateway -> public Lambda -> DynamoDB
```

Show this for product listings, product detail pages, posts, public site
settings, and public checkout config.

Useful routes:

- `GET /api/products`
- `GET /api/products/{slug}`
- `GET /api/posts`
- `GET /api/site`
- `GET /api/public-config`

Useful nodes:

- CloudFront
- HTTP API Gateway
- public read Lambdas
- DynamoDB tables

## Image And Asset Delivery

Flow:

```text
Visitor -> CloudFront /images/* -> S3 site bucket images/
```

Show this separately from the frontend load if you want to explain product and
post image delivery. The same private S3 bucket stores both the frontend and
uploaded/generated images.

Useful nodes:

- CloudFront
- `ironwallengraving-site`
- product/post image prefixes

## Checkout And Payment Preparation

Flow:

```text
Customer -> API Gateway -> checkout Lambdas -> DynamoDB carts/orders
                                |-> Stripe
                                |-> Shippo
```

Show this to explain the server-side checkout flow before payment completion.
The checkout Lambdas validate carts, calculate rates/taxes, create or update
Stripe payment state, and store cart/order snapshots in DynamoDB.

Useful routes:

- `POST /api/cart/validate`
- `POST /api/checkout/start`
- `GET /api/checkout/{cartId}`
- `POST /api/checkout/{cartId}/rates`
- `POST /api/checkout/{cartId}/pricing`
- `POST /api/checkout/{cartId}/prepare-payment`
- `GET /api/checkout/status/{cartId}`

Useful nodes:

- HTTP API Gateway
- checkout Lambdas
- DynamoDB carts/orders/products/site settings
- Stripe
- Shippo

## Stripe Webhook And Order Completion

Flow:

```text
Stripe -> API Gateway -> stripeWebhook Lambda -> DynamoDB
                                      |-> payment-completed outbox
```

Show this to explain how external payment events become durable order state.
The webhook validates Stripe events, records webhook idempotency data, updates
checkout/order state, and creates payment-completed outbox work.

Useful nodes:

- Stripe
- HTTP API Gateway
- `stripeWebhook`
- `ironwallengraving-stripe-webhook-events`
- `ironwallengraving-orders`
- `ironwallengraving-payment-completed-outbox`

## Paid Order Fanout And Side Effects

Flow:

```text
paymentCompletedOutboxDrainer -> SNS payment-completed topic
                               -> SQS worker queues
                               -> worker Lambdas
                               -> DynamoDB / SES
```

Show this as one of the most important backend workflows. It explains why paid
order side effects are decoupled: stock adjustment, customer confirmation,
owner notification, and owner to-do creation each run independently.

Useful nodes:

- EventBridge payment outbox schedule
- `paymentCompletedOutboxDrainer`
- `ironwallengraving-payment-completed`
- paid-order SQS queues
- worker Lambdas
- DynamoDB orders/products/inventory ledger/owner todos
- Amazon SES

## Inventory Reservation Cleanup

Flow:

```text
EventBridge -> inventoryReservationDrainer -> DynamoDB inventory reservations
                                             -> DynamoDB products/inventory ledger
```

Show this to explain background cleanup for reserved inventory. It releases
expired or abandoned reservations so stock can return to sellable inventory.

Useful nodes:

- EventBridge inventory reservation schedule
- `inventoryReservationDrainer`
- `ironwallengraving-inventory-reservations`
- `ironwallengraving-products`
- `ironwallengraving-inventory-ledger`

## Admin Authentication And Admin API

Flow:

```text
Admin -> Auth0 -> API Gateway JWT authorizer -> admin Lambda -> DynamoDB/S3/SQS
```

Show this to explain the protected owner/admin side of the site. API Gateway
requires Auth0 JWTs for admin routes, and admin Lambdas update products, posts,
orders, inventory, and site settings.

Useful nodes:

- Auth0
- HTTP API Gateway authorizer
- admin Lambdas
- DynamoDB tables
- S3 site bucket
- storefront renderer queue

## Catalog Publishing And Prerendering

Flow:

```text
Admin catalog/site change -> SQS storefront renderer queue
                           -> storefrontHtmlRenderer Lambda
                           -> S3 site bucket
                           -> CloudFront invalidation
```

Show this to explain how admin changes become public static/prerendered
storefront content.

Useful producers:

- `adminPutProduct`
- `adminDeleteProduct`
- `adminAdjustInventory`
- `adminPutPost`
- `adminDeletePost`
- `adminPutSite`

Useful nodes:

- storefront renderer SQS queue
- `storefrontHtmlRenderer`
- S3 site bucket
- CloudFront

## Shipping Label And Shipment Notification

Flow:

```text
Admin -> API Gateway -> shipping/admin Lambdas -> Shippo
                                      |-> SQS shipment notification queue
                                      |-> shipmentNotification Lambda -> SES
```

Show this to explain fulfillment. Admin actions can buy labels, mark orders
shipped, record tracking, and queue customer shipment notification emails.

Useful nodes:

- HTTP API Gateway
- `adminBuyShippingLabel`
- `adminShipOrders`
- Shippo
- shipment notification SQS queue
- `shipmentNotification`
- Amazon SES
- DynamoDB orders

## Observability And Alerting

Flow:

```text
API/Lambda/SQS/CloudFront -> CloudWatch logs/metrics/alarms -> SNS alarms -> email
```

Show this as an operations workflow. It explains how failures become visible:
API errors, outbox failures, inventory reservation failures, DLQ depth, owner
to-do backlog, and CloudFront errors.

Useful nodes:

- CloudWatch Logs
- CloudWatch Alarms
- SNS alarm topics
- CloudTrail
- GuardDuty

## Deployment Flow

Flow:

```text
Pull request -> PR Checks
main branch -> Deploy Staging
manual release -> Production or DR plan/apply
```

Show this if the case study includes delivery and operations maturity. GitHub
Actions validates changes, packages frontend/Lambda artifacts, reads deployment
values from SSM, runs Terraform, and invalidates CloudFront after apply.

Useful nodes:

- PR Checks
- Deploy Staging
- Release Production
- Release Artifact Packaging
- Terraform App Stack Deploy
- AWS Account Bootstrap
- SSM Parameter Store

## Disaster Recovery Failover

Flow:

```text
Cloudflare -> DR CloudFront -> DR API/S3/Lambda stack
DynamoDB Global Tables <-> replicated table data
S3 production bucket -> DR site bucket
```

Show this as an overlay, not as a duplicate of every resource. The key story is
that traffic moves manually through Cloudflare/CloudFront, DynamoDB data is
global and bidirectional, S3 assets replicate to a separate DR bucket, and DR
background workers stay disabled until failover.

Useful nodes:

- Cloudflare
- production CloudFront
- DR CloudFront
- DynamoDB Global Tables
- production S3 bucket
- DR S3 bucket
- DR SQS/EventBridge/Lambda background processing

## Disaster Recovery Failback

Flow:

```text
DR writes -> DynamoDB Global Tables -> primary region
DR S3-created objects -> sync back to production bucket
Cloudflare -> production CloudFront
```

Show this to answer the key reliability question: data written during DR is not
lost when returning to primary. DynamoDB writes replicate back automatically,
but S3 objects created in DR need an explicit sync back to production.

Useful nodes:

- DynamoDB Global Tables
- DR S3 bucket
- production S3 bucket
- Cloudflare
- production CloudFront
