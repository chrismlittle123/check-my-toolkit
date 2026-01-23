import { describe, expect, it } from "vitest";

import { isValidArn, parseArn } from "../../../src/infra/arn.js";

describe("isValidArn", () => {
  it("should return true for valid ARNs", () => {
    expect(isValidArn("arn:aws:s3:::my-bucket")).toBe(true);
    expect(isValidArn("arn:aws:lambda:us-east-1:123456789012:function:my-function")).toBe(true);
    expect(isValidArn("arn:aws:iam::123456789012:role/my-role")).toBe(true);
  });

  it("should return false for invalid ARNs", () => {
    expect(isValidArn("")).toBe(false);
    expect(isValidArn("not-an-arn")).toBe(false);
    expect(isValidArn("arn:aws")).toBe(false);
    expect(isValidArn("arn:aws:s3")).toBe(false);
    // "arn:aws:s3:::" is technically valid format (has 6 parts), just empty resource
  });

  it("should return true for ARNs with empty components", () => {
    // S3 has empty region and account
    expect(isValidArn("arn:aws:s3:::my-bucket")).toBe(true);
  });
});

describe("parseArn", () => {
  describe("S3 ARNs", () => {
    it("should parse S3 bucket ARN", () => {
      const result = parseArn("arn:aws:s3:::my-bucket");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "s3",
        region: "",
        accountId: "",
        resourceType: "bucket",
        resourceId: "my-bucket",
        raw: "arn:aws:s3:::my-bucket",
      });
    });

    it("should parse S3 object ARN", () => {
      const result = parseArn("arn:aws:s3:::my-bucket/path/to/object.txt");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "s3",
        region: "",
        accountId: "",
        resourceType: "object",
        resourceId: "my-bucket/path/to/object.txt",
        raw: "arn:aws:s3:::my-bucket/path/to/object.txt",
      });
    });
  });

  describe("Lambda ARNs", () => {
    it("should parse Lambda function ARN", () => {
      const result = parseArn("arn:aws:lambda:us-east-1:123456789012:function:my-function");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "lambda",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "function",
        resourceId: "my-function",
        raw: "arn:aws:lambda:us-east-1:123456789012:function:my-function",
      });
    });

    it("should parse Lambda function ARN with version", () => {
      const result = parseArn("arn:aws:lambda:us-east-1:123456789012:function:my-function:1");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "lambda",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "function",
        resourceId: "my-function",
        raw: "arn:aws:lambda:us-east-1:123456789012:function:my-function:1",
      });
    });

    it("should parse Lambda layer ARN", () => {
      const result = parseArn("arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "lambda",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "layer",
        resourceId: "my-layer",
        raw: "arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1",
      });
    });
  });

  describe("DynamoDB ARNs", () => {
    it("should parse DynamoDB table ARN", () => {
      const result = parseArn("arn:aws:dynamodb:us-east-1:123456789012:table/my-table");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "dynamodb",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "table",
        resourceId: "my-table",
        raw: "arn:aws:dynamodb:us-east-1:123456789012:table/my-table",
      });
    });

    it("should parse DynamoDB index ARN", () => {
      const result = parseArn(
        "arn:aws:dynamodb:us-east-1:123456789012:table/my-table/index/my-index"
      );
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "dynamodb",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "index",
        resourceId: "my-table/index/my-index",
        raw: "arn:aws:dynamodb:us-east-1:123456789012:table/my-table/index/my-index",
      });
    });
  });

  describe("SQS ARNs", () => {
    it("should parse SQS queue ARN", () => {
      const result = parseArn("arn:aws:sqs:us-east-1:123456789012:my-queue");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "sqs",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "queue",
        resourceId: "my-queue",
        raw: "arn:aws:sqs:us-east-1:123456789012:my-queue",
      });
    });
  });

  describe("SNS ARNs", () => {
    it("should parse SNS topic ARN", () => {
      const result = parseArn("arn:aws:sns:us-east-1:123456789012:my-topic");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "sns",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "topic",
        resourceId: "my-topic",
        raw: "arn:aws:sns:us-east-1:123456789012:my-topic",
      });
    });
  });

  describe("IAM ARNs", () => {
    it("should parse IAM role ARN", () => {
      const result = parseArn("arn:aws:iam::123456789012:role/my-role");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "iam",
        region: "",
        accountId: "123456789012",
        resourceType: "role",
        resourceId: "my-role",
        raw: "arn:aws:iam::123456789012:role/my-role",
      });
    });

    it("should parse IAM policy ARN", () => {
      const result = parseArn("arn:aws:iam::123456789012:policy/my-policy");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "iam",
        region: "",
        accountId: "123456789012",
        resourceType: "policy",
        resourceId: "my-policy",
        raw: "arn:aws:iam::123456789012:policy/my-policy",
      });
    });

    it("should parse IAM policy ARN with path", () => {
      const result = parseArn("arn:aws:iam::123456789012:policy/path/to/my-policy");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "iam",
        region: "",
        accountId: "123456789012",
        resourceType: "policy",
        resourceId: "path/to/my-policy",
        raw: "arn:aws:iam::123456789012:policy/path/to/my-policy",
      });
    });
  });

  describe("Secrets Manager ARNs", () => {
    it("should parse Secrets Manager secret ARN", () => {
      const result = parseArn("arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret-AbCdEf");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "secretsmanager",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "secret",
        resourceId: "my-secret-AbCdEf",
        raw: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret-AbCdEf",
      });
    });
  });

  describe("CloudWatch Logs ARNs", () => {
    it("should parse log group ARN", () => {
      const result = parseArn("arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "logs",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "log-group",
        resourceId: "/aws/lambda/my-function",
        raw: "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function",
      });
    });

    it("should parse log group ARN with trailing :*", () => {
      const result = parseArn("arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function:*");
      expect(result).toEqual({ cloud: "aws",
        partition: "aws",
        service: "logs",
        region: "us-east-1",
        accountId: "123456789012",
        resourceType: "log-group",
        resourceId: "/aws/lambda/my-function",
        raw: "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function:*",
      });
    });
  });

  describe("Invalid ARNs", () => {
    it("should return null for invalid ARNs", () => {
      expect(parseArn("")).toBeNull();
      expect(parseArn("not-an-arn")).toBeNull();
      expect(parseArn("arn:aws")).toBeNull();
    });
  });
});
