# Setup S3 upload cho Fitnit Challenge

Mục tiêu: các file upload mới từ backend sẽ được lưu lên Amazon S3. Các ảnh đang là link web như `https://...` giữ nguyên và có thể cập nhật/migrate sau.

## 1. Quy tắc dữ liệu ảnh

Hệ thống sẽ giữ 2 dạng ảnh:

| Dạng dữ liệu | Ví dụ | Cách xử lý |
|---|---|---|
| Link web | `https://images.pexels.com/...` | Giữ nguyên, frontend load trực tiếp |
| Upload nội bộ | `uploads/images/abc.jpg` | Lưu trong S3, truy cập qua domain/CDN |

Backend upload mới vẫn trả về key tương đối:

```text
uploads/images/<file>.jpg
uploads/videos/<file>.mp4
```

Như vậy database không bị phụ thuộc bucket name hoặc domain CDN.

## 2. Tạo S3 bucket

Tạo bucket:

```text
Bucket name: fitnit-uploads-prod
Region: ap-southeast-1
Object Ownership: Bucket owner enforced
Block Public Access: ON
Versioning: Enable
Default encryption: SSE-S3
```

Không bật static website hosting cho bucket uploads.

## 3. IAM cho backend

Nếu backend chạy ECS/Fargate, gắn policy này vào ECS task role của backend:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::fitnit-uploads-prod/uploads/*"
    }
  ]
}
```

Không hard-code AWS access key trong code hoặc Docker image. Local dev có thể dùng `aws configure`, còn production nên dùng IAM Role.

## 4. Bật S3 trong backend

Set env cho backend:

```env
STORAGE_PROVIDER=s3
AWS_REGION=ap-southeast-1
S3_UPLOAD_BUCKET=fitnit-uploads-prod
```

Local mặc định vẫn là:

```env
STORAGE_PROVIDER=local
```

## 5. CloudFront cho `/uploads/*`

Production nên route:

```text
/uploads/* -> S3 bucket origin
/api/*     -> backend
/pose/*    -> fitness-ai
/*         -> frontend
```

Nếu dùng CloudFront với S3 private bucket, tạo Origin Access Control (OAC), rồi gắn bucket policy do AWS console gợi ý.

Kết quả:

```text
https://fitnit.vn/uploads/images/abc.jpg
```

CloudFront sẽ đọc object:

```text
s3://fitnit-uploads-prod/uploads/images/abc.jpg
```

## 6. Ảnh upload cũ

Khi cần migrate ảnh cũ đang nằm trong local folder/volume:

```bash
aws s3 sync ./uploads s3://fitnit-uploads-prod/uploads
```

Chỉ làm bước này khi bạn đã chắc chắn thư mục local `uploads/` là nguồn dữ liệu đúng.

## 7. Test

Upload thử một ảnh qua admin hoặc API:

```bash
curl -F "file=@sample.jpg" https://fitnit.vn/api/files/upload-image
```

Kỳ vọng response:

```text
uploads/images/sample_<timestamp>.jpg
```

Kiểm tra object trong S3:

```bash
aws s3 ls s3://fitnit-uploads-prod/uploads/images/
```

Kiểm tra URL public qua CloudFront/domain:

```bash
curl -I https://fitnit.vn/uploads/images/<file-name>
```

