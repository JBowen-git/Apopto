# DR Overlay Diagram Spec

This document describes the disaster-recovery overlay that should sit on top of
the production infrastructure JSON documents. It is intended as guidance for
future Codex work that creates a React diagram or a dedicated `dr-overlay.json`
data file.

## Purpose

The DR overlay should not duplicate every production Lambda, SQS queue,
DynamoDB table, or API route. The production documents already describe those
resources. The overlay should explain what changes during disaster recovery:
traffic routing, active region, replicated data paths, disabled background work,
failover, and failback.

## Regions

- Primary region: `us-east-2`
- Disaster-recovery region: `us-east-1`

The normal production stack runs in `us-east-2`. The DR stack is a hot-standby
stack in `us-east-1`.

## Traffic Flow

Normal traffic:

```text
Cloudflare -> production CloudFront -> production API/S3/Lambda stack
```

DR traffic after failover:

```text
Cloudflare -> DR CloudFront -> DR API/S3/Lambda stack
```

Cloudflare owns DNS for the production domain. The repo does not manage Route
53 or automated DNS failover.

## Data Replication

DynamoDB:

- Production tables are DynamoDB Global Tables.
- Replication is between `us-east-2` and `us-east-1`.
- Table names remain `ironwallengraving-*`.
- Writes in DR replicate back to the primary region.
- The DR Terraform stack reads the replicated tables and does not create its
  own DynamoDB tables.

S3:

- Production bucket: `ironwallengraving-site`
- DR bucket: `ironwallengraving-dr-site`
- S3 replication is one-way from production to DR.
- Existing objects require an initial backfill or batch replication step.
- During failback, DR-created S3 objects must be synced back to production.

## Background Processing

The DR stack creates its own worker Lambdas, SQS queues, EventBridge schedules,
and API resources, but background processing is disabled until failover.

Disabled until failover:

- DR SQS Lambda consumers
- DR EventBridge schedules
- DR background order side effects

Enabled during failover:

- DR SQS consumers
- DR EventBridge schedules
- DR order side-effect recovery path

## Failover Story

The diagram should show failover as a manual control-plane change:

1. Fence or stop primary public traffic.
2. Disable primary background processing if the primary stack is still reachable.
3. Confirm DynamoDB replication is healthy enough for failover.
4. Move or associate the production CloudFront alternate domain/certificate to
   the DR distribution as needed.
5. Update Cloudflare DNS so the production domain points to the DR CloudFront
   distribution.
6. Enable DR background processing.
7. Verify checkout, Stripe webhooks, Shippo webhooks, admin order views, email
   delivery, and S3 asset access.
8. Run order side-effect recovery to catch paid-order work that reached primary
   SQS but did not finish before the outage.

## Failback Story

The diagram should show failback as a controlled return to primary:

1. Keep production traffic on DR while the primary region recovers.
2. Wait for DynamoDB writes from DR to replicate back to `us-east-2`.
3. Sync DR-created S3 objects back to `ironwallengraving-site`.
4. Disable DR background processing.
5. Move the CloudFront alternate domain/certificate back to the primary
   distribution as needed.
6. Update Cloudflare DNS so the production domain points back to the primary
   CloudFront distribution.
7. Re-enable primary background processing.
8. Verify no missing order side effects.

## Suggested JSON Shape

Future Codex work can turn this into a dedicated JSON document shaped like:

```json
{
  "name": "Production DR Overlay",
  "type": "dr_overlay",
  "description": "Manual hot-standby DR flow for the production stack.",
  "regions": {
    "primary": "us-east-2",
    "disaster_recovery": "us-east-1"
  },
  "traffic": {
    "normal": ["Cloudflare", "production CloudFront", "production stack"],
    "failover": ["Cloudflare", "DR CloudFront", "DR stack"]
  },
  "replication": [
    {
      "name": "DynamoDB Global Tables",
      "direction": "bidirectional",
      "description": "Writes in either region replicate to the other region."
    },
    {
      "name": "S3 site assets",
      "direction": "production-to-dr",
      "description": "Production site bucket replicates to the DR site bucket; failback requires syncing DR-created objects back."
    }
  ],
  "failover": [],
  "failback": []
}
```

Keep this overlay focused on behavior and relationships. Do not recreate every
resource already documented in the production JSON files.
