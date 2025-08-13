const fs = require('fs');
const path = require('path');

function loadEnvVariables() {
    const envFiles = [
        path.join(__dirname, '.env'),
        path.join(__dirname, 'packages/mira-server/.env'),
        path.join(__dirname, 'packages/mira-dashboard/.env')
    ];

    const envVars = {};

    envFiles.forEach(envFile => {
        if (fs.existsSync(envFile)) {
            const content = fs.readFileSync(envFile, 'utf8');
            content.split('\n').forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const [key, ...valueParts] = trimmedLine.split('=');
                    if (key && valueParts.length > 0) {
                        envVars[key.trim()] = valueParts.join('=').trim();
                    }
                }
            });
        }
    });

    return envVars;
}

// 加载并设置环境变量
const envVars = loadEnvVariables();
Object.assign(process.env, envVars);

console.log('Loaded environment variables:');
console.log(`MIRA_SERVER_HTTP_PORT: ${process.env.MIRA_SERVER_HTTP_PORT || process.env.HTTP_PORT || '8080'}`);
console.log(`MIRA_SERVER_WS_PORT: ${process.env.MIRA_SERVER_WS_PORT || process.env.WS_PORT || '8081'}`);
console.log(`MIRA_DASHBOARD_PORT: ${process.env.MIRA_DASHBOARD_PORT || process.env.VITE_APP_PORT || '3000'}`);
