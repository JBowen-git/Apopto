locals {
  client_portal_table_name = "ClientPortal-${var.deployment_environment}"
  client_portal_table_deletion_protection_enabled = (
    var.deployment_environment == "production" || !var.client_portal_table_allow_destroy
  )
  client_portal_table_index_arns = [
    "${aws_dynamodb_table.client_portal.arn}/index/GSI1",
    "${aws_dynamodb_table.client_portal.arn}/index/GSI2",
  ]
}

resource "aws_dynamodb_table" "client_portal" {
  name                        = local.client_portal_table_name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "PK"
  range_key                   = "SK"
  deletion_protection_enabled = local.client_portal_table_deletion_protection_enabled

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    projection_type = "ALL"

    key_schema {
      attribute_name = "GSI1PK"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "GSI1SK"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "GSI2"
    projection_type = "ALL"

    key_schema {
      attribute_name = "GSI2PK"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "GSI2SK"
      key_type       = "RANGE"
    }
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.client_portal_table_name
  }
}

resource "aws_iam_role" "identity_intake_lambda" {
  name               = "${local.resource_prefix}-identity-intake-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-identity-intake-role"
  }
}

resource "aws_iam_role_policy_attachment" "identity_intake_lambda_basic" {
  role       = aws_iam_role.identity_intake_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "identity_intake_dynamodb" {
  statement {
    sid    = "ReadWriteClientPortalTable"
    effect = "Allow"

    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]

    resources = [aws_dynamodb_table.client_portal.arn]
  }

  statement {
    sid    = "QueryClientPortalIndexes"
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = local.client_portal_table_index_arns
  }
}

resource "aws_iam_role_policy" "identity_intake_dynamodb" {
  name   = "${local.resource_prefix}-identity-intake-dynamodb"
  role   = aws_iam_role.identity_intake_lambda.id
  policy = data.aws_iam_policy_document.identity_intake_dynamodb.json
}
