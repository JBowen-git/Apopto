locals {
  state_bucket_name           = coalesce(var.state_bucket_name, "${var.client_slug}-terraform-state")
  site_deploy_role_name       = coalesce(var.site_deploy_role_name, "${var.client_slug}-github-actions-site-deploy")
  production_deploy_role_name = coalesce(var.production_deploy_role_name, "${var.client_slug}-production-app-deploy")

  default_tags = merge(
    {
      Client    = var.client_slug
      ManagedBy = "Terraform"
    },
    var.tags,
  )
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = local.state_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = local.state_bucket_name
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = var.github_oidc_url
  client_id_list  = [var.github_oidc_audience]
  thumbprint_list = var.github_oidc_thumbprints

  tags = {
    Name = "${var.client_slug}-github-actions-oidc"
  }
}

data "aws_iam_policy_document" "site_deploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = [var.github_oidc_audience]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.github_staging_branch}"]
    }
  }
}

resource "aws_iam_role" "site_deploy" {
  name               = local.site_deploy_role_name
  assume_role_policy = data.aws_iam_policy_document.site_deploy_assume_role.json

  tags = {
    Name        = local.site_deploy_role_name
    Environment = "staging"
  }
}

data "aws_iam_policy_document" "production_deploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.site_deploy.arn]
    }
  }
}

resource "aws_iam_role" "production_deploy" {
  name               = local.production_deploy_role_name
  assume_role_policy = data.aws_iam_policy_document.production_deploy_assume_role.json

  tags = {
    Name        = local.production_deploy_role_name
    Environment = "production"
  }
}

data "aws_iam_policy_document" "app_deploy" {
  statement {
    sid       = "ReadAccountIdentity"
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }

  statement {
    sid       = "ListBucketsForTerraform"
    effect    = "Allow"
    actions   = ["s3:ListAllMyBuckets"]
    resources = ["*"]
  }

  statement {
    sid    = "ManageClientBucketsAndState"
    effect = "Allow"

    actions = ["s3:*"]

    resources = [
      "arn:aws:s3:::${local.state_bucket_name}",
      "arn:aws:s3:::${local.state_bucket_name}/*",
      "arn:aws:s3:::${var.client_slug}-*",
      "arn:aws:s3:::${var.client_slug}-*/*",
    ]
  }

  statement {
    sid    = "ManageServerlessAppInfrastructure"
    effect = "Allow"

    actions = [
      "apigateway:*",
      "cloudfront:*",
      "iam:AttachRolePolicy",
      "iam:CreatePolicy",
      "iam:CreatePolicyVersion",
      "iam:CreateRole",
      "iam:DeletePolicy",
      "iam:DeletePolicyVersion",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:ListPolicies",
      "iam:ListPolicyVersions",
      "iam:ListRolePolicies",
      "iam:ListRoles",
      "iam:PassRole",
      "iam:PutRolePolicy",
      "iam:TagPolicy",
      "iam:TagRole",
      "iam:UntagPolicy",
      "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:UpdateRole",
      "lambda:*",
      "logs:*",
      "sqs:*",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "app_deploy" {
  name        = "${var.client_slug}-app-deploy"
  description = "Allows app infrastructure and asset deployment for ${var.client_slug}."
  policy      = data.aws_iam_policy_document.app_deploy.json

  tags = {
    Name = "${var.client_slug}-app-deploy"
  }
}

data "aws_iam_policy_document" "site_deploy_assume_production" {
  statement {
    sid       = "AssumeProductionDeployRole"
    effect    = "Allow"
    actions   = ["sts:AssumeRole"]
    resources = [aws_iam_role.production_deploy.arn]
  }
}

resource "aws_iam_policy" "site_deploy_assume_production" {
  name        = "${var.client_slug}-site-deploy-assume-production"
  description = "Allows the staging GitHub Actions role to assume the production deploy role."
  policy      = data.aws_iam_policy_document.site_deploy_assume_production.json

  tags = {
    Name = "${var.client_slug}-site-deploy-assume-production"
  }
}

resource "aws_iam_role_policy_attachment" "site_deploy_app" {
  role       = aws_iam_role.site_deploy.name
  policy_arn = aws_iam_policy.app_deploy.arn
}

resource "aws_iam_role_policy_attachment" "site_deploy_assume_production" {
  role       = aws_iam_role.site_deploy.name
  policy_arn = aws_iam_policy.site_deploy_assume_production.arn
}

resource "aws_iam_role_policy_attachment" "production_deploy_app" {
  role       = aws_iam_role.production_deploy.name
  policy_arn = aws_iam_policy.app_deploy.arn
}
