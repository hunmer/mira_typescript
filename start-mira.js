#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 加载环境变量函数
function loadEnvFile(envPath) {
    const envVars = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
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
    return envVars;
}

// 加载所有环境变量
const rootEnv = loadEnvFile(path.join(__dirname, '.env'));
const serverEnv = loadEnvFile(path.join(__dirname, 'packages/mira-server/.env'));
const dashboardEnv = loadEnvFile(path.join(__dirname, 'packages/mira-dashboard/.env'));

// 合并环境变量
const env = {
    ...process.env,
    ...rootEnv,
    ...serverEnv,
    ...dashboardEnv
};

const command = process.argv[2];
const service = process.argv[3];

switch (command) {
    case 'start':
        if (service === 'server') {
            console.log(`🚀 Starting Mira Server on port ${env.HTTP_PORT || '8080'}...`);
            const serverProcess = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, 'packages/mira-server'),
                env,
                stdio: 'inherit'
            });

            serverProcess.on('exit', (code) => {
                console.log(`Server process exited with code ${code}`);
            });

        } else if (service === 'dashboard') {
            console.log(`🚀 Starting Mira Dashboard on port ${env.VITE_APP_PORT || '3000'}...`);
            const dashboardProcess = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, 'packages/mira-dashboard'),
                env,
                stdio: 'inherit'
            });

            dashboardProcess.on('exit', (code) => {
                console.log(`Dashboard process exited with code ${code}`);
            });

        } else if (service === 'full-stack') {
            console.log('🚀 Starting full Mira stack...');

            // 启动服务器
            const serverProcess = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, 'packages/mira-server'),
                env,
                stdio: 'inherit'
            });

            // 等待服务器启动后启动前端
            setTimeout(() => {
                const dashboardProcess = spawn('npm', ['run', 'dev'], {
                    cwd: path.join(__dirname, 'packages/mira-dashboard'),
                    env,
                    stdio: 'inherit'
                });
            }, 3000);
        }
        break;

    default:
        console.log('Usage: node start-mira.js start [server|dashboard|full-stack]');
        console.log('');
        console.log('Environment variables:');
        console.log(`HTTP_PORT: ${env.HTTP_PORT || '8080'}`);
        console.log(`WS_PORT: ${env.WS_PORT || '8081'}`);
        console.log(`VITE_APP_PORT: ${env.VITE_APP_PORT || '3000'}`);
}
