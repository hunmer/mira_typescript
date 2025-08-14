#!/bin/sh
set -e

# 检查环境变量并替换配置
if [ -n "$API_BASE_URL" ]; then
    echo "Setting API base URL to: $API_BASE_URL"
    
    # 使用 printf 和 awk 来替换，避免 sed 的特殊字符问题
    cat > /tmp/config.js << EOF
window.__RUNTIME_CONFIG__ = { API_BASE_URL: '$API_BASE_URL' };
EOF
    
    # 替换 index.html 中的运行时配置
    awk '
    /window\.__RUNTIME_CONFIG__/ {
        print "    <script>"
        while ((getline line < "/tmp/config.js") > 0) {
            print "        " line
        }
        close("/tmp/config.js")
        print "    </script>"
        next
    }
    { print }
    ' /usr/share/nginx/html/index.html > /tmp/index.html && mv /tmp/index.html /usr/share/nginx/html/index.html
    
    # 检查 API_BASE_URL 是否是外部地址
    case "$API_BASE_URL" in
        http://*|https://*)
            echo "External API URL detected, disabling nginx proxy"
            # 移除 nginx 配置中的代理部分，用简单的 404 响应替代
            sed -i '/# API 代理到后端服务/,/proxy_buffering off;/c\
        # API proxy disabled for external URL\
        location /api/ {\
            return 404 "API proxy disabled - using external API";\
        }' /etc/nginx/nginx.conf
            ;;
        *)
            echo "Internal API URL detected, updating nginx proxy"
            sed -i "s|http://mira-app-server:3999|$API_BASE_URL|g" /etc/nginx/nginx.conf
            ;;
    esac
fi

if [ -n "$SERVER_NAME" ]; then
    echo "Setting server name to: $SERVER_NAME"
    sed -i "s/server_name localhost;/server_name $SERVER_NAME;/g" /etc/nginx/nginx.conf
fi

# 启动 nginx
exec nginx -g "daemon off;"
