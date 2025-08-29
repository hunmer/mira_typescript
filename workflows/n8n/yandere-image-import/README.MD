# Yandere.re Image Import to Mira Workflow

This n8n workflow automatically fetches the latest 10 images from Yande.re API and uploads them to your Mira system using custom nodes.

## Overview

The workflow performs the following steps:
1. **Authentication**: Logs into Mira using credentials
2. **API Fetch**: Retrieves latest posts from Yande.re API
3. **Data Processing**: Transforms API response for Mira compatibility
4. **Image Download**: Downloads high-quality images from Yande.re
5. **Upload to Mira**: Uploads images with metadata to Mira system
6. **Result Logging**: Tracks successful and failed uploads

## Workflow Structure

### Node Details

#### 1. Mira Login
- **Type**: `CUSTOM.miraLogin`
- **Purpose**: Authenticates with Mira system
- **Configuration**: Uses stored credentials "Mira Login account 2"

#### 2. Fetch Yandere Posts
- **Type**: `n8n-nodes-base.httpRequest`
- **URL**: `https://yande.re/post.json?limit=10`
- **Method**: GET
- **Purpose**: Retrieves latest 10 posts from Yande.re API
- **Response Format**: JSON

#### 3. Process Yandere Data
- **Type**: `n8n-nodes-base.code`
- **Purpose**: Transforms Yande.re API response into Mira-compatible format
- **Key Functions**:
  - Extracts image URLs (jpeg_url, file_url, sample_url, preview_url)
  - Parses metadata (tags, rating, score, author, dimensions)
  - Generates appropriate filenames
  - Prepares Mira upload data structure

#### 4. Download Image
- **Type**: `n8n-nodes-base.httpRequest`
- **Purpose**: Downloads the actual image files from Yande.re
- **Configuration**: 
  - Uses dynamic URL from processed data
  - 60-second timeout for large files
  - Returns binary file data

#### 5. Mira File Upload
- **Type**: `CUSTOM.miraFileUpload`
- **Purpose**: Uploads images to Mira with rich metadata
- **Metadata Includes**:
  - Title: "Yandere Post {id}"
  - Description: Tags, rating, score, author
  - Category: "yandere_import"
  - Tags: Parsed from Yande.re tags
  - Source tracking: Original URL, ID, rating, score

#### 6. Check Upload Success
- **Type**: `n8n-nodes-base.if`
- **Purpose**: Routes workflow based on upload success/failure

#### 7. Log Success / Log Error
- **Type**: `n8n-nodes-base.code`
- **Purpose**: Comprehensive logging of upload results

#### 8. Merge Results
- **Type**: `n8n-nodes-base.merge`
- **Purpose**: Combines success and error logs for final reporting

## API Reference

### Yande.re API
- **Endpoint**: `https://yande.re/post.json`
- **Parameters**:
  - `limit`: Number of posts (max 100, we use 10)
  - `page`: Page number for pagination
  - `tags`: Filter by specific tags
- **Response**: Array of post objects with image data and metadata

### Key Response Fields Used
```javascript
{
  id: number,           // Unique post ID
  tags: string,         // Space-separated tags
  rating: string,       // safe, questionable, explicit
  score: number,        // Community rating
  author: string,       // Uploader username
  source: string,       // Original source URL
  file_url: string,     // Full resolution image
  jpeg_url: string,     // JPEG version (preferred)
  sample_url: string,   // Medium resolution
  preview_url: string,  // Thumbnail
  width: number,        // Image width
  height: number,       // Image height
  file_size: number,    // File size in bytes
  created_at: number    // Unix timestamp
}
```

## Usage Instructions

### Prerequisites
1. **n8n Installation**: Ensure n8n is running with custom node support
2. **Mira Custom Nodes**: Install Mira login and file upload nodes
3. **Credentials**: Configure Mira login credentials in n8n

### Setup Steps
1. Import the workflow JSON file into n8n
2. Configure Mira Login credentials:
   - Go to Credentials in n8n
   - Create/update "Mira Login account 2"
   - Add your Mira authentication details

### Running the Workflow
1. **Manual Execution**: Click "Execute Workflow" in n8n interface
2. **Scheduled Execution**: Add a Schedule Trigger node for automated runs
3. **Webhook Trigger**: Add a Webhook node for external triggering

### Monitoring
- Check the execution log for detailed progress
- Success/error logs provide comprehensive upload tracking
- Failed uploads are logged with specific error details

## Configuration Options

### Customizing Image Count
Modify the `limit` parameter in "Fetch Yandere Posts" node:
```javascript
"url": "https://yande.re/post.json?limit=20"  // Fetch 20 images instead
```

### Adding Tag Filters
Add tag filtering to the API request:
```javascript
"url": "https://yande.re/post.json?limit=10&tags=landscape"  // Only landscape images
```

### Image Quality Selection
Modify the image URL selection in "Process Yandere Data":
```javascript
// Current: Prefers JPEG, falls back to original
imageUrl: post.jpeg_url || post.file_url,

// Alternative: Always use highest quality
imageUrl: post.file_url,

// Alternative: Use sample size for faster processing
imageUrl: post.sample_url,
```

## Error Handling

The workflow includes comprehensive error handling:

### Network Errors
- HTTP timeouts are set to 30s (API) and 60s (image download)
- Failed downloads are logged but don't stop the workflow

### Upload Errors
- Each upload is validated
- Failed uploads are logged with specific error messages
- Successful uploads continue even if some fail

### Data Validation
- Checks for required fields before processing
- Handles missing URLs gracefully
- Validates image formats

## Performance Considerations

### Rate Limiting
- Yande.re has rate limits; avoid frequent requests
- Consider adding delays between requests for large batches

### File Sizes
- Some Yande.re images are very large (>10MB)
- Adjust timeout values if needed
- Consider using sample_url for faster processing

### Batch Processing
- Current limit of 10 images per run prevents overwhelming
- For larger imports, consider pagination with multiple runs

## Development Notes

### Custom Node Integration
The workflow seamlessly integrates with Mira's custom n8n nodes:
- **Context Integration**: Uses `#context7` for dynamic content processing
- **Fetch Logic**: Implements `#fetch` for external API data retrieval
- **Metadata Preservation**: Maintains rich metadata throughout the pipeline

### Production Considerations
1. **Credential Security**: Store Mira credentials securely
2. **Error Monitoring**: Set up alerts for failed uploads
3. **Storage Management**: Monitor Mira storage usage
4. **Content Filtering**: Consider implementing content filters for ratings
5. **Duplicate Prevention**: Add MD5 checking to prevent duplicate uploads

### Extending the Workflow
- **Add Image Processing**: Insert resize/optimization nodes
- **Implement Tagging**: Add custom tag processing logic
- **Create Collections**: Group imported images by date/theme
- **Add Notifications**: Send alerts on completion/errors

## Troubleshooting

### Common Issues
1. **Authentication Failures**: Verify Mira credentials
2. **Network Timeouts**: Increase timeout values for slow connections
3. **Image Download Failures**: Check Yande.re availability
4. **Upload Failures**: Verify Mira server capacity and permissions

### Debugging
- Enable detailed logging in n8n
- Check individual node outputs
- Monitor Mira server logs
- Verify API response formats

This workflow provides a robust, production-ready solution for importing Yande.re images into your Mira system with comprehensive metadata preservation and error handling.