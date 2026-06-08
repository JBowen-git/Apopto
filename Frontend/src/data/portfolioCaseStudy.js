import workflowGuideSource from '../../../case-study-workflows-to-show.md?raw'
import deploymentFlowResources from '../../../deployment-flow-resources.json'
import drOverlaySpecSource from '../../../dr-overlay-diagram-spec.md?raw'
import drS3Resources from '../../../dr-s3-resources.json'
import productionApiGatewayResources from '../../../production-api-gateway-resources.json'
import productionCloudfrontResources from '../../../production-cloudfront-resources.json'
import productionCloudtrailResources from '../../../production-cloudtrail-resources.json'
import productionCloudwatchAlarmsResources from '../../../production-cloudwatch-alarms-resources.json'
import productionCloudwatchLogsResources from '../../../production-cloudwatch-logs-resources.json'
import productionDynamodbTables from '../../../production-dynamodb-tables.json'
import productionEventbridgeResources from '../../../production-eventbridge-resources.json'
import productionExternalRuntimeResources from '../../../production-external-runtime-resources.json'
import productionGuarddutyResources from '../../../production-guardduty-resources.json'
import productionIamResources from '../../../production-iam-resources.json'
import productionLambdaIamNested from '../../../production-lambda-iam-nested.json'
import productionS3Resources from '../../../production-s3-resources.json'
import productionSesResources from '../../../production-ses-resources.json'
import productionSnsResources from '../../../production-sns-resources.json'
import productionSqsResources from '../../../production-sqs-resources.json'

const resourceCollections = [
  deploymentFlowResources,
  drS3Resources,
  productionApiGatewayResources,
  productionCloudfrontResources,
  productionCloudtrailResources,
  productionCloudwatchAlarmsResources,
  productionCloudwatchLogsResources,
  productionDynamodbTables,
  productionEventbridgeResources,
  productionExternalRuntimeResources,
  productionGuarddutyResources,
  productionIamResources,
  productionLambdaIamNested,
  productionS3Resources,
  productionSesResources,
  productionSnsResources,
  productionSqsResources,
]

const allCaseStudyResources = resourceCollections.flatMap((collection) => (
  Array.isArray(collection) ? collection : []
))

const resourcesByName = new Map(
  allCaseStudyResources
    .filter((resource) => resource?.name)
    .map((resource) => [resource.name, resource]),
)

const lambdasByName = new Map(
  productionLambdaIamNested
    .filter((resource) => resource?.name)
    .map((resource) => [resource.name, resource]),
)

function resourceDescription(name, fallback) {
  return resourcesByName.get(name)?.description || fallback
}

function lambdaDescription(name, fallback) {
  return lambdasByName.get(name)?.description || fallback
}

function findRoute(route) {
  return productionApiGatewayResources[0]?.routes?.find((entry) => entry.route === route)
}

function routeTarget(route, fallback) {
  return findRoute(route)?.target || fallback
}

export const documentedWorkflowTitles = Array.from(
  workflowGuideSource.matchAll(/^## (.+)$/gm),
  (match) => match[1],
)

export const caseStudySources = {
  workflowGuideSource,
  drOverlaySpecSource,
  resourceCount: allCaseStudyResources.length,
}

export const caseStudyHeroStats = [
  {
    label: 'API routes',
    value: String(productionApiGatewayResources[0]?.routes?.length || 0),
  },
  {
    label: 'Lambda functions',
    value: String(productionLambdaIamNested.length),
  },
  {
    label: 'DynamoDB tables',
    value: String(productionDynamodbTables.length),
  },
  {
    label: 'Workflows',
    value: String(documentedWorkflowTitles.length),
  },
]

const baseNodes = {
  admin: {
    title: 'Admin',
    subtitle: 'Protected owner workspace',
    body: 'The store owner manages products, posts, inventory, shipping, and site settings through authenticated admin flows.',
    meta: 'Owner',
  },
  adminChange: {
    title: 'Admin catalog change',
    subtitle: 'Product, post, inventory, or site update',
    body: 'Admin mutations publish the updated catalog instead of waiting for public pages to discover stale data.',
    meta: 'Admin event',
  },
  adminLambdas: {
    title: 'Admin Lambdas',
    subtitle: 'Protected API handlers',
    body: 'JWT-protected functions update catalog, posts, orders, inventory, site settings, uploads, and dashboard data.',
    meta: 'Lambda group',
  },
  alarmsSns: {
    title: 'SNS alarm topics',
    subtitle: 'Regional and global notifications',
    body: resourceDescription('ironwallengraving-alarms', 'CloudWatch alarms publish production alerts to regional and global SNS topics.'),
    meta: 'SNS',
  },
  apiGateway: {
    title: 'HTTP API Gateway',
    subtitle: 'Storefront, checkout, admin, and webhook API',
    body: resourceDescription('ironwallengraving-http-api', 'CloudFront forwards API traffic to HTTP API Gateway, which invokes Lambda functions.'),
    meta: '33 routes',
  },
  artifactPackaging: {
    title: 'Release artifact packaging',
    subtitle: 'Frontend and Lambda artifacts',
    body: resourceDescription('Release Artifact Packaging', 'Builds deployable frontend assets and Lambda packages for Terraform.'),
    meta: 'Build step',
  },
  auth0: {
    title: 'Auth0',
    subtitle: 'Admin identity provider',
    body: resourceDescription('Auth0', 'Auth0 issues JWTs that API Gateway requires for protected admin routes.'),
    meta: 'Identity',
  },
  awsBootstrap: {
    title: 'AWS account bootstrap',
    subtitle: 'OIDC and deploy roles',
    body: resourceDescription('AWS Account Bootstrap', 'One-time account setup creates the GitHub OIDC trust and deployment roles.'),
    meta: 'Bootstrap',
  },
  checkoutLambdas: {
    title: 'Checkout Lambdas',
    subtitle: 'Cart, rates, pricing, and payment setup',
    body: [
      routeTarget('POST /api/cart/validate', 'cartValidate'),
      routeTarget('POST /api/checkout/start', 'checkoutStart'),
      routeTarget('POST /api/checkout/{cartId}/rates', 'checkoutRates'),
      routeTarget('POST /api/checkout/{cartId}/pricing', 'checkoutPricing'),
      routeTarget('POST /api/checkout/{cartId}/prepare-payment', 'checkoutPreparePayment'),
    ].join(', '),
    meta: 'Server checkout',
  },
  checkoutTables: {
    title: 'Checkout tables',
    subtitle: 'Carts, orders, products, and settings',
    body: 'DynamoDB stores cart snapshots, pricing, order state, product stock, inventory reservations, and Shippo origin settings.',
    meta: 'DynamoDB',
  },
  cloudflare: {
    title: 'Cloudflare',
    subtitle: 'DNS and manual DR cutover',
    body: resourceDescription('Cloudflare', 'Cloudflare owns DNS and points public traffic at the active CloudFront distribution.'),
    meta: 'DNS',
  },
  cloudfront: {
    title: 'CloudFront',
    subtitle: 'Public edge distribution',
    body: resourceDescription('ironwallengraving.com', 'CloudFront serves the private S3 storefront and forwards /api/* traffic to API Gateway.'),
    meta: 'Edge',
  },
  cloudfrontInvalidation: {
    title: 'CloudFront invalidation',
    subtitle: 'Refresh changed public pages',
    body: 'After deploys or storefront prerendering, invalidations move visitors onto the newest generated pages and assets.',
    meta: 'Cache refresh',
  },
  cloudfrontPolicy: {
    title: 'Private content policy',
    subtitle: 'S3 reads limited to CloudFront',
    body: resourceDescription('PolicyForCloudFrontPrivateContent', 'The S3 bucket policy lets CloudFront read private objects without making the bucket public.'),
    meta: 'S3 policy',
  },
  cloudtrail: {
    title: 'CloudTrail',
    subtitle: 'AWS account audit trail',
    body: resourceDescription('ironwallengraving-audit', 'CloudTrail records account activity and writes audit logs to the production log bucket.'),
    meta: 'Audit',
  },
  cloudwatch: {
    title: 'CloudWatch',
    subtitle: 'Logs, metrics, and alarms',
    body: resourceDescription('Amazon CloudWatch Logs', 'CloudWatch collects API Gateway access logs, Lambda logs, metric filters, and production alarms.'),
    meta: 'Operations',
  },
  customer: {
    title: 'Customer',
    subtitle: 'Buyer checkout journey',
    body: 'A shopper validates cart state, compares rates, prepares payment, and waits for durable fulfillment work.',
    meta: 'Visitor',
  },
  customerConfirmationLambda: {
    title: 'Customer confirmation',
    subtitle: 'Paid-order email worker',
    body: lambdaDescription('customerConfirmation', 'Sends the customer confirmation email after a paid-order event.'),
    meta: 'Lambda',
  },
  deployedResources: {
    title: 'AWS resources',
    subtitle: 'Production or DR stack',
    body: 'Terraform applies the CloudFront, S3, API, Lambda, DynamoDB, SQS, SNS, and observability resources for the selected target.',
    meta: 'Terraform',
  },
  drBackgroundProcessing: {
    title: 'DR background processing',
    subtitle: 'Disabled until failover',
    body: 'The DR stack has workers, queues, and schedules, but background side effects stay disabled until traffic intentionally moves to DR.',
    meta: 'DR control',
  },
  drCloudFront: {
    title: 'DR CloudFront',
    subtitle: 'Standby edge distribution',
    body: 'During failover, Cloudflare can point the production domain at a DR CloudFront distribution in the standby stack.',
    meta: 'us-east-1',
  },
  drS3Site: {
    title: 'DR site bucket',
    subtitle: 'Replicated storefront assets',
    body: resourceDescription('ironwallengraving-dr-site', 'The DR bucket receives replicated site and asset objects from production.'),
    meta: 'S3 DR',
  },
  drStack: {
    title: 'DR API/S3/Lambda stack',
    subtitle: 'Hot standby region',
    body: 'The disaster-recovery stack can serve API, storefront, and worker paths after DNS and background processing are moved over.',
    meta: 'us-east-1',
  },
  dynamodbAllTables: {
    title: 'DynamoDB tables',
    subtitle: 'Catalog, order, inventory, settings, and task data',
    body: 'Ten production tables hold the commerce data model, including product, order, inventory, webhook, outbox, and owner task records.',
    meta: '10 tables',
  },
  dynamodbGlobalTables: {
    title: 'DynamoDB Global Tables',
    subtitle: 'Bidirectional production and DR data',
    body: 'Writes in either region replicate to the other, so DR checkout/order data can return to primary during failback.',
    meta: 'Replicated',
  },
  dynamodbPublicTables: {
    title: 'Public read tables',
    subtitle: 'Products, posts, and site settings',
    body: 'Public Lambda reads product listings, product detail data, posts, site settings, and checkout config from DynamoDB.',
    meta: 'DynamoDB',
  },
  emailInbox: {
    title: 'Owner email',
    subtitle: 'Alert destination',
    body: 'Production alarms are routed to notification topics so API, queue, worker, and CloudFront failures become visible.',
    meta: 'Notify',
  },
  eventBridgeInventory: {
    title: 'Inventory release schedule',
    subtitle: 'Runs every minute',
    body: resourceDescription('ironwallengraving-inventoryReservationDrainer-schedule', 'EventBridge starts the inventory reservation cleanup worker every minute.'),
    meta: 'EventBridge',
  },
  eventBridgePayment: {
    title: 'Payment outbox schedule',
    subtitle: 'Runs every minute',
    body: resourceDescription('ironwallengraving-paymentCompletedOutboxDrainer-schedule', 'EventBridge starts the payment-completed outbox drainer every minute.'),
    meta: 'EventBridge',
  },
  githubDeployStaging: {
    title: 'Deploy Staging',
    subtitle: 'Continuous deployment',
    body: resourceDescription('Deploy Staging', 'Pushes to main validate, package, apply staging Terraform, and invalidate CloudFront.'),
    meta: 'GitHub Actions',
  },
  githubPrChecks: {
    title: 'PR Checks',
    subtitle: 'Validation before merge',
    body: resourceDescription('PR Checks', 'Pull requests run secret scanning, repo validation, frontend checks, backend tests, and Terraform validation.'),
    meta: 'GitHub Actions',
  },
  githubReleaseProduction: {
    title: 'Release Production',
    subtitle: 'Manual production or DR release',
    body: resourceDescription('Release Production', 'Manual workflow can plan or apply the production-class stack for production or disaster recovery.'),
    meta: 'GitHub Actions',
  },
  guardduty: {
    title: 'GuardDuty',
    subtitle: 'Threat detection',
    body: resourceDescription('Amazon GuardDuty', 'GuardDuty is enabled in the production AWS account and region for threat detection.'),
    meta: 'Security',
  },
  inventoryLedger: {
    title: 'Inventory ledger',
    subtitle: 'Auditable stock movement',
    body: resourceDescription('ironwallengraving-inventory-ledger', 'Immutable inventory movement records make sale, reservation, release, and manual adjustment history auditable.'),
    meta: 'DynamoDB',
  },
  inventoryReservationDrainer: {
    title: 'Reservation drainer',
    subtitle: 'Releases expired holds',
    body: lambdaDescription('inventoryReservationDrainer', 'Scheduled worker releases expired or abandoned inventory reservations.'),
    meta: 'Lambda',
  },
  inventoryReservationsTable: {
    title: 'Inventory reservations',
    subtitle: 'Cart stock holds and leases',
    body: resourceDescription('ironwallengraving-inventory-reservations', 'Stores stock holds, release schedules, worker leases, and cleanup metadata.'),
    meta: 'DynamoDB',
  },
  inventoryTables: {
    title: 'Inventory records',
    subtitle: 'Products and ledger entries',
    body: 'Paid-order stock workers update product stock and write immutable inventory ledger records.',
    meta: 'DynamoDB',
  },
  itemStockLambda: {
    title: 'Item stock worker',
    subtitle: 'Paid-order stock adjustment',
    body: lambdaDescription('itemStock', 'Consumes paid-order messages and updates product stock plus the inventory ledger.'),
    meta: 'Lambda',
  },
  lambdaGroup: {
    title: 'Lambda functions',
    subtitle: 'API and background workers',
    body: 'The production stack includes API handlers, webhooks, scheduled workers, SQS consumers, and the storefront renderer.',
    meta: '42 functions',
  },
  operationsEmail: {
    title: 'Operations email',
    subtitle: 'Alert recipient',
    body: 'Alert notifications are delivered to the configured owner/operator inbox for triage.',
    meta: 'Email',
  },
  orderSideEffectRecovery: {
    title: 'Order side-effect recovery',
    subtitle: 'DR catch-up path',
    body: lambdaDescription('orderSideEffectRecovery', 'Manual DR recovery function catches paid-order side effects that did not finish before an outage.'),
    meta: 'Lambda',
  },
  ordersTable: {
    title: 'Orders table',
    subtitle: 'Payment and fulfillment state',
    body: resourceDescription('ironwallengraving-orders', 'Stores completed checkout snapshots, payment references, fulfillment state, shipping metadata, and side-effect markers.'),
    meta: 'DynamoDB',
  },
  ownerNotificationLambda: {
    title: 'Owner notification',
    subtitle: 'Paid-order owner email',
    body: lambdaDescription('ownerNotification', 'Sends the owner notification email after a paid-order event.'),
    meta: 'Lambda',
  },
  ownerOrderTodoLambda: {
    title: 'Owner to-do worker',
    subtitle: 'Fulfillment task creation',
    body: lambdaDescription('ownerOrderTodo', 'Creates owner fulfillment to-do records for paid orders.'),
    meta: 'Lambda',
  },
  ownerTodosTable: {
    title: 'Owner order to-dos',
    subtitle: 'Durable fulfillment tasks',
    body: resourceDescription('ironwallengraving-owner-order-todos', 'Stores owner-facing tasks created from paid orders and Stripe disputes.'),
    meta: 'DynamoDB',
  },
  paidOrderQueues: {
    title: 'Paid-order SQS queues',
    subtitle: 'Independent side-effect workers',
    body: 'Stock, customer email, owner email, and owner to-do queues each receive the same paid-order business event.',
    meta: 'SQS fanout',
  },
  paymentOutboxDrainer: {
    title: 'Outbox drainer',
    subtitle: 'Publishes due paid-order events',
    body: lambdaDescription('paymentCompletedOutboxDrainer', 'Scheduled worker drains durable payment-completed outbox rows and publishes eligible events.'),
    meta: 'Lambda',
  },
  paymentOutboxTable: {
    title: 'Payment-completed outbox',
    subtitle: 'Durable side-effect queue',
    body: resourceDescription('ironwallengraving-payment-completed-outbox', 'Stores pending, publishing, and published paid-order side-effect records.'),
    meta: 'DynamoDB',
  },
  paymentTopic: {
    title: 'Payment-completed topic',
    subtitle: 'Business event fanout',
    body: resourceDescription('ironwallengraving-payment-completed', 'SNS fans paid-order events out to independent downstream worker queues.'),
    meta: 'SNS',
  },
  primaryCloudFront: {
    title: 'Production CloudFront',
    subtitle: 'Primary public edge',
    body: 'Normal traffic lands on the production CloudFront distribution before reaching the primary API and S3 stack.',
    meta: 'us-east-2',
  },
  primaryS3: {
    title: 'Production S3 bucket',
    subtitle: 'Primary site and asset objects',
    body: resourceDescription('ironwallengraving-site', 'Stores deployed frontend files, generated images, and storefront renderer assets.'),
    meta: 'S3 primary',
  },
  primaryStack: {
    title: 'Primary API/S3/Lambda stack',
    subtitle: 'Recovered production region',
    body: 'After recovery, traffic and background processing return to the primary production stack.',
    meta: 'us-east-2',
  },
  productImages: {
    title: 'Product and post images',
    subtitle: 'S3 images prefix',
    body: 'Product and content images live beside the static site in the private S3 bucket and are served through CloudFront.',
    meta: 'images/',
  },
  productsTable: {
    title: 'Products table',
    subtitle: 'Catalog and stock snapshot',
    body: resourceDescription('ironwallengraving-products', 'Stores sellable product and color variant records, pricing, stock, SEO slugs, and image metadata.'),
    meta: 'DynamoDB',
  },
  publicLambdas: {
    title: 'Public read Lambdas',
    subtitle: 'Catalog, content, site, and config',
    body: [
      routeTarget('GET /api/products', 'getProducts'),
      routeTarget('GET /api/products/{slug}', 'getProductBySlug'),
      routeTarget('GET /api/posts', 'getPosts'),
      routeTarget('GET /api/site', 'getSite'),
      routeTarget('GET /api/public-config', 'publicConfig'),
    ].join(', '),
    meta: 'Public API',
  },
  rendererQueue: {
    title: 'Storefront renderer queue',
    subtitle: 'Publish-time SQS work',
    body: resourceDescription('ironwallengraving-storefront-html-renderer-queue', 'SQS queue for publish-time storefront HTML regeneration.'),
    meta: 'SQS',
  },
  ses: {
    title: 'Amazon SES',
    subtitle: 'Customer and owner email',
    body: resourceDescription('Amazon SES', 'SES sends order confirmation, owner notification, and shipment notification email.'),
    meta: 'Email',
  },
  shipmentNotificationLambda: {
    title: 'Shipment notification',
    subtitle: 'Customer tracking email',
    body: lambdaDescription('shipmentNotification', 'Sends customer shipment notification email after fulfillment updates.'),
    meta: 'Lambda',
  },
  shipmentQueue: {
    title: 'Shipment notification queue',
    subtitle: 'Fulfillment email work',
    body: resourceDescription('ironwallengraving-shipment-notification-queue', 'SQS queue for customer shipment notification messages.'),
    meta: 'SQS',
  },
  shippo: {
    title: 'Shippo',
    subtitle: 'Rates, labels, and tracking',
    body: resourceDescription('Shippo', 'Shippo provides shipping rates, label purchase, and shipment tracking webhook support.'),
    meta: 'Shipping',
  },
  shippingLambdas: {
    title: 'Shipping Lambdas',
    subtitle: 'Label purchase and fulfillment updates',
    body: [
      lambdaDescription('adminBuyShippingLabel', 'Admin buys a Shippo shipping label for an order.'),
      lambdaDescription('adminShipOrders', 'Admin marks orders shipped and queues shipment notifications.'),
    ].join(' '),
    meta: 'Lambda group',
  },
  s3Site: {
    title: 'S3 site bucket',
    subtitle: 'Private static site and assets',
    body: resourceDescription('ironwallengraving-site', 'Private S3 bucket stores deployed frontend files, product images, posts, and renderer assets.'),
    meta: 'S3',
  },
  s3SyncBack: {
    title: 'S3 sync back',
    subtitle: 'DR-created objects return home',
    body: 'Objects created while running from DR must be synced back to the production bucket before failback completes.',
    meta: 'Failback',
  },
  ssmParameterStore: {
    title: 'SSM Parameter Store',
    subtitle: 'Deploy and runtime values',
    body: 'Deployment workflows read target-specific Auth0, Stripe, Shippo, and runtime configuration from SSM.',
    meta: 'Config',
  },
  sqsQueues: {
    title: 'SQS queues and DLQs',
    subtitle: 'Background work plus failure buffers',
    body: 'Worker queues decouple order, shipment, and renderer work, with DLQs feeding operational alarms.',
    meta: 'SQS',
  },
  storefrontContent: {
    title: 'Generated storefront content',
    subtitle: 'Static public HTML and JSON',
    body: 'The renderer writes updated storefront objects into S3 so public pages can load quickly through CloudFront.',
    meta: 'S3 objects',
  },
  storefrontRenderer: {
    title: 'Storefront renderer',
    subtitle: 'Prerender Lambda',
    body: lambdaDescription('storefrontHtmlRenderer', 'Regenerates prerendered storefront HTML and invalidates CloudFront.'),
    meta: 'Lambda',
  },
  stripe: {
    title: 'Stripe',
    subtitle: 'Payments, tax, and webhooks',
    body: resourceDescription('Stripe', 'Stripe processes checkout payments, calculates tax, and sends payment/dispute webhooks.'),
    meta: 'Payments',
  },
  stripeWebhookEvents: {
    title: 'Stripe webhook events',
    subtitle: 'Idempotency and audit table',
    body: resourceDescription('ironwallengraving-stripe-webhook-events', 'Stores webhook delivery counts, processing leases, outcomes, related payment IDs, and failure details.'),
    meta: 'DynamoDB',
  },
  stripeWebhookLambda: {
    title: 'Stripe webhook Lambda',
    subtitle: 'Payment event processor',
    body: lambdaDescription('stripeWebhook', 'Validates Stripe events, updates checkout/order state, and creates payment-completed outbox work.'),
    meta: 'Lambda',
  },
  terraformDeploy: {
    title: 'Terraform app stack deploy',
    subtitle: 'Plan, apply, and invalidate',
    body: resourceDescription('Terraform App Stack Deploy', 'Initializes the target backend, validates SSM values, and plans or applies Terraform.'),
    meta: 'Terraform',
  },
  visitor: {
    title: 'Visitor',
    subtitle: 'Public storefront request',
    body: 'A shopper or reader enters through the public domain and receives static storefront content or API-backed data.',
    meta: 'Browser',
  },
}

function node(id, x, y, overrides = {}) {
  return {
    ...baseNodes[id],
    id,
    x,
    y,
    ...overrides,
  }
}

function edge(from, to, label) {
  return {
    from,
    to,
    label,
  }
}

export const caseStudyWorkflows = [
  {
    id: 'public-storefront-load',
    label: 'Storefront load',
    title: 'Public Storefront Load',
    summary: 'Static storefront requests resolve through Cloudflare, land on CloudFront, and read private site files from S3.',
    nodes: [
      node('visitor', 10, 52),
      node('cloudflare', 30, 52),
      node('cloudfront', 52, 52),
      node('s3Site', 76, 52),
      node('cloudfrontPolicy', 76, 24),
    ],
    edges: [
      edge('visitor', 'cloudflare', 'domain'),
      edge('cloudflare', 'cloudfront', 'DNS target'),
      edge('cloudfront', 's3Site', 'private read'),
      edge('cloudfrontPolicy', 's3Site', 'allows OAC'),
    ],
    outcome: 'Visitors get a cached static storefront while the S3 bucket stays private.',
  },
  {
    id: 'public-catalog-content-reads',
    label: 'Catalog reads',
    title: 'Public Catalog And Content Reads',
    summary: 'Public catalog, post, site settings, and checkout config requests travel through CloudFront to API Gateway and read DynamoDB through Lambda.',
    nodes: [
      node('visitor', 9, 52),
      node('cloudfront', 27, 52),
      node('apiGateway', 47, 52),
      node('publicLambdas', 66, 52),
      node('dynamodbPublicTables', 84, 52),
    ],
    edges: [
      edge('visitor', 'cloudfront', '/api/*'),
      edge('cloudfront', 'apiGateway', 'forward'),
      edge('apiGateway', 'publicLambdas', 'invoke'),
      edge('publicLambdas', 'dynamodbPublicTables', 'read'),
    ],
    outcome: 'Product listings, product pages, posts, site settings, and public config stay API-backed without exposing database access.',
  },
  {
    id: 'image-asset-delivery',
    label: 'Images and assets',
    title: 'Image And Asset Delivery',
    summary: 'Product and post images are served from the private S3 site bucket through the same CloudFront distribution.',
    nodes: [
      node('visitor', 12, 52),
      node('cloudfront', 36, 52),
      node('s3Site', 62, 52),
      node('productImages', 82, 52),
      node('cloudfrontPolicy', 62, 24),
    ],
    edges: [
      edge('visitor', 'cloudfront', '/images/*'),
      edge('cloudfront', 's3Site', 'private read'),
      edge('s3Site', 'productImages', 'image prefixes'),
      edge('cloudfrontPolicy', 's3Site', 'protects bucket'),
    ],
    outcome: 'Media is fast at the edge, but the origin bucket remains locked behind CloudFront.',
  },
  {
    id: 'checkout-payment-preparation',
    label: 'Checkout prep',
    title: 'Checkout And Payment Preparation',
    summary: 'Checkout Lambdas validate cart data, calculate pricing and rates, prepare payment state, and write durable snapshots before completion.',
    nodes: [
      node('customer', 9, 52),
      node('apiGateway', 27, 52),
      node('checkoutLambdas', 47, 52),
      node('checkoutTables', 68, 52),
      node('stripe', 86, 30),
      node('shippo', 86, 70),
    ],
    edges: [
      edge('customer', 'apiGateway', 'checkout API'),
      edge('apiGateway', 'checkoutLambdas', 'invoke'),
      edge('checkoutLambdas', 'checkoutTables', 'snapshots'),
      edge('checkoutLambdas', 'stripe', 'payment intent'),
      edge('checkoutLambdas', 'shippo', 'rates'),
    ],
    outcome: 'The browser never owns critical pricing, stock, tax, or payment decisions.',
  },
  {
    id: 'stripe-webhook-order-completion',
    label: 'Stripe webhook',
    title: 'Stripe Webhook And Order Completion',
    summary: 'Stripe events become durable order state through a webhook Lambda, idempotency table, orders table, and payment-completed outbox.',
    nodes: [
      node('stripe', 10, 52),
      node('apiGateway', 29, 52),
      node('stripeWebhookLambda', 48, 52),
      node('stripeWebhookEvents', 68, 28),
      node('ordersTable', 68, 72),
      node('paymentOutboxTable', 86, 52),
    ],
    edges: [
      edge('stripe', 'apiGateway', 'webhook'),
      edge('apiGateway', 'stripeWebhookLambda', 'invoke'),
      edge('stripeWebhookLambda', 'stripeWebhookEvents', 'idempotency'),
      edge('stripeWebhookLambda', 'ordersTable', 'order state'),
      edge('stripeWebhookLambda', 'paymentOutboxTable', 'side-effect work'),
    ],
    outcome: 'Payment completion is recoverable, auditable, and separated from downstream email, stock, and task work.',
  },
  {
    id: 'paid-order-fanout-side-effects',
    label: 'Paid-order fanout',
    title: 'Paid Order Fanout And Side Effects',
    summary: 'A scheduled outbox publisher sends paid-order events to SNS, which fans out to independent SQS-backed workers.',
    nodes: [
      node('eventBridgePayment', 10, 24),
      node('paymentOutboxTable', 10, 72),
      node('paymentOutboxDrainer', 28, 50),
      node('paymentTopic', 45, 50),
      node('paidOrderQueues', 61, 50),
      node('itemStockLambda', 77, 20),
      node('customerConfirmationLambda', 77, 42),
      node('ownerNotificationLambda', 77, 62),
      node('ownerOrderTodoLambda', 77, 82),
      node('inventoryTables', 90, 20),
      node('ses', 90, 52),
      node('ownerTodosTable', 90, 82),
    ],
    edges: [
      edge('eventBridgePayment', 'paymentOutboxDrainer', 'schedule'),
      edge('paymentOutboxTable', 'paymentOutboxDrainer', 'due rows'),
      edge('paymentOutboxDrainer', 'paymentTopic', 'publish'),
      edge('paymentTopic', 'paidOrderQueues', 'fanout'),
      edge('paidOrderQueues', 'itemStockLambda', 'stock queue'),
      edge('paidOrderQueues', 'customerConfirmationLambda', 'email queue'),
      edge('paidOrderQueues', 'ownerNotificationLambda', 'owner queue'),
      edge('paidOrderQueues', 'ownerOrderTodoLambda', 'task queue'),
      edge('itemStockLambda', 'inventoryTables', 'stock writes'),
      edge('customerConfirmationLambda', 'ses', 'email'),
      edge('ownerNotificationLambda', 'ses', 'email'),
      edge('ownerOrderTodoLambda', 'ownerTodosTable', 'task write'),
    ],
    outcome: 'Paid-order side effects are decoupled, retryable, and independently observable.',
  },
  {
    id: 'inventory-reservation-cleanup',
    label: 'Inventory cleanup',
    title: 'Inventory Reservation Cleanup',
    summary: 'Expired cart reservations are released by a scheduled worker so abandoned holds return to sellable stock.',
    nodes: [
      node('eventBridgeInventory', 12, 50),
      node('inventoryReservationDrainer', 34, 50),
      node('inventoryReservationsTable', 56, 30),
      node('productsTable', 76, 30),
      node('inventoryLedger', 76, 70),
    ],
    edges: [
      edge('eventBridgeInventory', 'inventoryReservationDrainer', 'schedule'),
      edge('inventoryReservationDrainer', 'inventoryReservationsTable', 'find due holds'),
      edge('inventoryReservationDrainer', 'productsTable', 'return stock'),
      edge('inventoryReservationDrainer', 'inventoryLedger', 'audit release'),
    ],
    outcome: 'Inventory can be reserved safely during checkout without permanently hiding abandoned stock.',
  },
  {
    id: 'admin-authentication-admin-api',
    label: 'Admin API',
    title: 'Admin Authentication And Admin API',
    summary: 'The protected admin side uses Auth0 JWTs, API Gateway authorization, Lambda handlers, and controlled access to data and publishing resources.',
    nodes: [
      node('admin', 10, 52),
      node('auth0', 28, 28),
      node('apiGateway', 28, 72),
      node('adminLambdas', 48, 52),
      node('dynamodbAllTables', 68, 28),
      node('s3Site', 68, 72),
      node('rendererQueue', 86, 72),
    ],
    edges: [
      edge('admin', 'auth0', 'sign in'),
      edge('auth0', 'apiGateway', 'JWT'),
      edge('admin', 'apiGateway', 'admin routes'),
      edge('apiGateway', 'adminLambdas', 'authorized invoke'),
      edge('adminLambdas', 'dynamodbAllTables', 'read/write'),
      edge('adminLambdas', 's3Site', 'uploads/assets'),
      edge('adminLambdas', 'rendererQueue', 'publish work'),
    ],
    outcome: 'Owner tools can mutate the business system without exposing admin routes or private storage publicly.',
  },
  {
    id: 'catalog-publishing-prerendering',
    label: 'Catalog publishing',
    title: 'Catalog Publishing And Prerendering',
    summary: 'Admin catalog and site changes queue renderer work that regenerates static storefront content and refreshes CloudFront.',
    nodes: [
      node('adminChange', 10, 52),
      node('rendererQueue', 30, 52),
      node('storefrontRenderer', 50, 52),
      node('storefrontContent', 70, 32),
      node('s3Site', 70, 70),
      node('cloudfrontInvalidation', 88, 52),
    ],
    edges: [
      edge('adminChange', 'rendererQueue', 'enqueue'),
      edge('rendererQueue', 'storefrontRenderer', 'consume'),
      edge('storefrontRenderer', 'storefrontContent', 'generate'),
      edge('storefrontRenderer', 's3Site', 'write'),
      edge('storefrontRenderer', 'cloudfrontInvalidation', 'refresh edge'),
    ],
    outcome: 'The public site can feel static-fast while still responding to owner-managed catalog changes.',
  },
  {
    id: 'shipping-label-shipment-notification',
    label: 'Shipping flow',
    title: 'Shipping Label And Shipment Notification',
    summary: 'Admin fulfillment actions buy labels or mark orders shipped, then queue customer tracking email through SES.',
    nodes: [
      node('admin', 8, 52),
      node('apiGateway', 25, 52),
      node('shippingLambdas', 43, 52),
      node('shippo', 62, 28),
      node('ordersTable', 62, 72),
      node('shipmentQueue', 78, 52),
      node('shipmentNotificationLambda', 88, 38),
      node('ses', 88, 70),
    ],
    edges: [
      edge('admin', 'apiGateway', 'fulfillment action'),
      edge('apiGateway', 'shippingLambdas', 'invoke'),
      edge('shippingLambdas', 'shippo', 'label/tracking'),
      edge('shippingLambdas', 'ordersTable', 'fulfillment state'),
      edge('shippingLambdas', 'shipmentQueue', 'queue email'),
      edge('shipmentQueue', 'shipmentNotificationLambda', 'consume'),
      edge('shipmentNotificationLambda', 'ses', 'tracking email'),
    ],
    outcome: 'Shipping updates become durable order state and customer communication instead of one-off admin actions.',
  },
  {
    id: 'observability-alerting',
    label: 'Observability',
    title: 'Observability And Alerting',
    summary: 'API, Lambda, queue, CloudFront, and security signals flow into logs, metrics, alarms, audit trails, and alert notifications.',
    nodes: [
      node('apiGateway', 12, 24),
      node('lambdaGroup', 12, 52),
      node('sqsQueues', 12, 78),
      node('cloudfront', 32, 52),
      node('cloudwatch', 52, 52),
      node('alarmsSns', 72, 34),
      node('operationsEmail', 90, 34),
      node('cloudtrail', 72, 64),
      node('guardduty', 90, 64),
    ],
    edges: [
      edge('apiGateway', 'cloudwatch', 'access logs'),
      edge('lambdaGroup', 'cloudwatch', 'logs/metrics'),
      edge('sqsQueues', 'cloudwatch', 'DLQ depth'),
      edge('cloudfront', 'cloudwatch', 'edge metrics'),
      edge('cloudwatch', 'alarmsSns', 'alarms'),
      edge('alarmsSns', 'operationsEmail', 'notify'),
      edge('cloudtrail', 'guardduty', 'account signals'),
    ],
    outcome: 'Failures become visible across API health, worker queues, paid-order fanout, inventory cleanup, CloudFront, audit, and security signals.',
  },
  {
    id: 'deployment-flow',
    label: 'Deployment',
    title: 'Deployment Flow',
    summary: 'GitHub Actions validates changes, packages artifacts, reads target configuration, runs Terraform, and refreshes CloudFront.',
    nodes: [
      node('githubPrChecks', 10, 30),
      node('githubDeployStaging', 10, 70),
      node('githubReleaseProduction', 29, 50),
      node('awsBootstrap', 47, 24),
      node('ssmParameterStore', 47, 76),
      node('artifactPackaging', 64, 50),
      node('terraformDeploy', 81, 50),
      node('deployedResources', 90, 34),
      node('cloudfrontInvalidation', 90, 70),
    ],
    edges: [
      edge('githubPrChecks', 'githubDeployStaging', 'merge gate'),
      edge('githubDeployStaging', 'artifactPackaging', 'package'),
      edge('githubReleaseProduction', 'artifactPackaging', 'package'),
      edge('awsBootstrap', 'terraformDeploy', 'roles'),
      edge('ssmParameterStore', 'terraformDeploy', 'values'),
      edge('artifactPackaging', 'terraformDeploy', 'artifacts'),
      edge('terraformDeploy', 'deployedResources', 'plan/apply'),
      edge('terraformDeploy', 'cloudfrontInvalidation', 'after apply'),
    ],
    outcome: 'Delivery is repeatable from pull request validation through staging, production, DR plan/apply, and edge refresh.',
  },
  {
    id: 'disaster-recovery-failover',
    label: 'DR failover',
    title: 'Disaster Recovery Failover',
    summary: 'Failover moves public traffic to the DR CloudFront/API/S3/Lambda stack while DynamoDB data stays globally replicated and DR workers are enabled intentionally.',
    nodes: [
      node('cloudflare', 9, 50),
      node('primaryCloudFront', 28, 28),
      node('drCloudFront', 28, 72),
      node('drStack', 48, 72),
      node('dynamodbGlobalTables', 68, 42),
      node('primaryS3', 68, 72),
      node('drS3Site', 84, 72),
      node('drBackgroundProcessing', 84, 30),
      node('orderSideEffectRecovery', 48, 28),
    ],
    edges: [
      edge('cloudflare', 'primaryCloudFront', 'normal target'),
      edge('cloudflare', 'drCloudFront', 'manual cutover'),
      edge('drCloudFront', 'drStack', 'serve traffic'),
      edge('drStack', 'dynamodbGlobalTables', 'read/write'),
      edge('primaryS3', 'drS3Site', 'replication'),
      edge('drS3Site', 'drStack', 'assets'),
      edge('drBackgroundProcessing', 'drStack', 'enable workers'),
      edge('orderSideEffectRecovery', 'drStack', 'catch up'),
    ],
    outcome: 'The failover story is manual and controlled: move DNS, verify replicated data/assets, enable DR background work, and recover unfinished paid-order side effects.',
  },
  {
    id: 'disaster-recovery-failback',
    label: 'DR failback',
    title: 'Disaster Recovery Failback',
    summary: 'Failback waits for DR writes to replicate home, syncs DR-created S3 objects back to production, then moves traffic and workers to the primary region.',
    nodes: [
      node('drStack', 10, 52),
      node('dynamodbGlobalTables', 30, 30),
      node('primaryStack', 52, 30),
      node('drS3Site', 30, 72),
      node('s3SyncBack', 52, 72),
      node('primaryS3', 72, 72),
      node('cloudflare', 72, 30),
      node('primaryCloudFront', 90, 30),
      node('drBackgroundProcessing', 90, 72),
    ],
    edges: [
      edge('drStack', 'dynamodbGlobalTables', 'DR writes'),
      edge('dynamodbGlobalTables', 'primaryStack', 'replicate home'),
      edge('drS3Site', 's3SyncBack', 'DR-created objects'),
      edge('s3SyncBack', 'primaryS3', 'sync back'),
      edge('cloudflare', 'primaryCloudFront', 'return DNS'),
      edge('primaryCloudFront', 'primaryStack', 'serve traffic'),
      edge('drBackgroundProcessing', 'drStack', 'disable workers'),
    ],
    outcome: 'Data written during DR is preserved before production traffic and background processing return to the primary stack.',
  },
]
