import ActorNode from './nodes/ActorNode.jsx'
import AdminNode from './nodes/AdminNode.jsx'
import ApiGatewayNode from './nodes/ApiGatewayNode.jsx'
import Auth0Node from './nodes/Auth0Node.jsx'
import CloudflareNode from './nodes/CloudflareNode.jsx'
import CloudFrontNode from './nodes/CloudFrontNode.jsx'
import CloudWatchNode from './nodes/CloudWatchNode.jsx'
import DeploymentNode from './nodes/DeploymentNode.jsx'
import DrNode from './nodes/DrNode.jsx'
import DynamoDbNode from './nodes/DynamoDbNode.jsx'
import EventBridgeNode from './nodes/EventBridgeNode.jsx'
import LambdaGroupNode from './nodes/LambdaGroupNode.jsx'
import NotificationNode from './nodes/NotificationNode.jsx'
import PolicyNode from './nodes/PolicyNode.jsx'
import S3BucketNode from './nodes/S3BucketNode.jsx'
import SecurityNode from './nodes/SecurityNode.jsx'
import SesNode from './nodes/SesNode.jsx'
import ShippoNode from './nodes/ShippoNode.jsx'
import SnsTopicNode from './nodes/SnsTopicNode.jsx'
import SqsQueueNode from './nodes/SqsQueueNode.jsx'
import StripeNode from './nodes/StripeNode.jsx'

export const caseStudyNodeRegistry = {
  admin: AdminNode,
  adminChange: AdminNode,
  adminLambdas: LambdaGroupNode,
  alarmsSns: SnsTopicNode,
  apiGateway: ApiGatewayNode,
  artifactPackaging: DeploymentNode,
  auth0: Auth0Node,
  awsBootstrap: DeploymentNode,
  checkoutLambdas: LambdaGroupNode,
  checkoutTables: DynamoDbNode,
  cloudflare: CloudflareNode,
  cloudfront: CloudFrontNode,
  cloudfrontInvalidation: CloudFrontNode,
  cloudfrontPolicy: PolicyNode,
  cloudtrail: SecurityNode,
  cloudwatch: CloudWatchNode,
  customer: ActorNode,
  customerConfirmationLambda: LambdaGroupNode,
  deployedResources: DeploymentNode,
  drBackgroundProcessing: DrNode,
  drCloudFront: CloudFrontNode,
  drS3Site: S3BucketNode,
  drStack: DrNode,
  dynamodbAllTables: DynamoDbNode,
  dynamodbGlobalTables: DynamoDbNode,
  dynamodbPublicTables: DynamoDbNode,
  emailInbox: NotificationNode,
  eventBridgeInventory: EventBridgeNode,
  eventBridgePayment: EventBridgeNode,
  githubDeployStaging: DeploymentNode,
  githubPrChecks: DeploymentNode,
  githubReleaseProduction: DeploymentNode,
  guardduty: SecurityNode,
  inventoryLedger: DynamoDbNode,
  inventoryReservationDrainer: LambdaGroupNode,
  inventoryReservationsTable: DynamoDbNode,
  inventoryTables: DynamoDbNode,
  itemStockLambda: LambdaGroupNode,
  lambdaGroup: LambdaGroupNode,
  operationsEmail: NotificationNode,
  orderSideEffectRecovery: LambdaGroupNode,
  ordersTable: DynamoDbNode,
  ownerNotificationLambda: LambdaGroupNode,
  ownerOrderTodoLambda: LambdaGroupNode,
  ownerTodosTable: DynamoDbNode,
  paidOrderQueues: SqsQueueNode,
  paymentOutboxDrainer: LambdaGroupNode,
  paymentOutboxTable: DynamoDbNode,
  paymentTopic: SnsTopicNode,
  primaryCloudFront: CloudFrontNode,
  primaryS3: S3BucketNode,
  primaryStack: DrNode,
  productImages: S3BucketNode,
  productsTable: DynamoDbNode,
  publicLambdas: LambdaGroupNode,
  rendererQueue: SqsQueueNode,
  ses: SesNode,
  shipmentNotificationLambda: LambdaGroupNode,
  shipmentQueue: SqsQueueNode,
  shippo: ShippoNode,
  shippingLambdas: LambdaGroupNode,
  s3Site: S3BucketNode,
  s3SyncBack: DrNode,
  ssmParameterStore: DeploymentNode,
  sqsQueues: SqsQueueNode,
  storefrontContent: S3BucketNode,
  storefrontRenderer: LambdaGroupNode,
  stripe: StripeNode,
  stripeWebhookEvents: DynamoDbNode,
  stripeWebhookLambda: LambdaGroupNode,
  terraformDeploy: DeploymentNode,
  visitor: ActorNode,
}
