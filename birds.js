const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');
const printLogo = require("./src/logo");

class BirdX {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            //"Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://birdx.birds.dog",
            "Referer": "https://birdx.birds.dog/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Wait ${i} seconds to continue the loop =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async callAPI(telegramauth) {
        const url = "https://api.birds.dog/user";
        const headers = { 
            ...this.headers, 
            "Telegramauth": `tma ${telegramauth}`
        };
        const payload = {
            "name": JSON.parse(decodeURIComponent(telegramauth.split('user=')[1].split('&')[0])).first_name + " " + JSON.parse(decodeURIComponent(telegramauth.split('user=')[1].split('&')[0])).last_name,
            "referId": 6269851518,
            "username": JSON.parse(decodeURIComponent(telegramauth.split('user=')[1].split('&')[0])).username
        };

        try {
            const getResponse = await axios.get(url, { headers });
            if (getResponse.data && getResponse.data.balance !== undefined) {
                this.log(`Login successful!`, 'success');
                this.log(`Balance: ${getResponse.data.balance}`, 'custom');
                return getResponse.data;
            } else {
                throw new Error("New account");
            }
        } catch (error) {
            this.log(`Login unsuccessful, registering account....`, 'warning');
            
            try {
                const postResponse = await axios.post(url, payload, { headers });
                if (postResponse.data && postResponse.data.balance !== undefined) {
                    this.log(`Registration successful!`, 'success');
                    this.log(`💰: ${postResponse.data.balance}`, 'custom');
                    return postResponse.data;
                } else {
                    throw new Error("Unable to register account");
                }
            } catch (postError) {
                this.log(`Error occurred: ${postError.message}`, 'error');
            }
        }

        this.log("Login failed. Switching account", 'error');
        return null;
    }

    async callWormMintAPI(telegramauth) {
        const statusUrl = "https://worm.birds.dog/worms/mint-status";
        const mintUrl = "https://worm.birds.dog/worms/mint";
        const headers = { 
            ...this.headers, 
            "Authorization": `tma ${telegramauth}`
        };

        try {
            const statusResponse = await axios.get(statusUrl, { headers });
            const statusData = statusResponse.data.data;

            if (statusData.status === "MINT_OPEN") {
                this.log("Worm spotted, catching it...", 'info');
                
                const mintResponse = await axios.post(mintUrl, {}, { headers });
                const mintData = mintResponse.data.data;
                this.log(`Result: ${mintResponse.data.message}`, 'custom');
                
                if (mintData && mintData.status === "WAITING") {
                    const nextMintTime = DateTime.fromISO(mintData.nextMintTime);
                    const formattedNextMintTime = nextMintTime.toLocaleString(DateTime.DATETIME_FULL);
                    this.log(`Next worm catch: ${formattedNextMintTime}`, 'info');
                }
            } else if (statusData.status === "WAITING") {
                const nextMintTime = DateTime.fromISO(statusData.nextMintTime);
                const formattedNextMintTime = nextMintTime.toLocaleString(DateTime.DATETIME_FULL);
                this.log(`No worms found, next catch: ${formattedNextMintTime}`, 'warning');
            } else {
                this.log(`Status: ${statusData.status}`, 'warning');
            }
        } catch (error) {
            this.log(`Error: ${error.message}`, 'error');
        }
    }

    async playEggMinigame(telegramauth) {
        const headers = { 
            ...this.headers, 
            "Telegramauth": `tma ${telegramauth}`
        };

        try {
            const joinResponse = await axios.get("https://api.birds.dog/minigame/egg/join", { headers });
            let { turn } = joinResponse.data;
            this.log(`Starting egg cracking: có ${turn} lượt`, 'info');

            const turnResponse = await axios.get("https://api.birds.dog/minigame/egg/turn", { headers });
            turn = turnResponse.data.turn;
            this.log(`Current turn: ${turn}`, 'info');

            let totalReward = 0;

            while (turn > 0) {
                const playResponse = await axios.get("https://api.birds.dog/minigame/egg/play", { headers });
                const { result } = playResponse.data;
                turn = playResponse.data.turn;
                totalReward += result;
                this.log(`${turn} egg cracks left | 🎁 ${result}`, 'custom');
            }

            const claimResponse = await axios.get("https://api.birds.dog/minigame/egg/claim", { headers });
            if (claimResponse.data === true) {
                this.log("Claim successful!", 'success');
                this.log(`Total 🎁: ${totalReward}`, 'custom');
            } else {
                this.log("Claim failed", 'error');
            }
        } catch (error) {
            this.log(`Egg minigame error: ${error.message}`, 'error');
        }
    }

    async nangcap(telegramauth, balance) {
        const headers = { 
            ...this.headers, 
            "Telegramauth": `tma ${telegramauth}`
        };
    
        try {
            const infoResponse = await axios.get("https://api.birds.dog/minigame/incubate/info", { headers });
            let incubationInfo = infoResponse.data;
            this.log(`🥚 level: ${incubationInfo.level}`, 'info');
    
            const currentTime = Date.now();
            const upgradeCompletionTime = incubationInfo.upgradedAt + (incubationInfo.duration * 60 * 60 * 1000);
    
            if (incubationInfo.status === "processing") {
                if (currentTime > upgradeCompletionTime) {
                    const confirmResponse = await axios.post("https://api.birds.dog/minigame/incubate/confirm-upgraded", {}, { headers });
                    if (confirmResponse.data === true) {
                        this.log("Upgrade completed", 'success');
                        const updatedInfoResponse = await axios.get("https://api.birds.dog/minigame/incubate/info", { headers });
                        incubationInfo = updatedInfoResponse.data;
                    } else {
                        this.log("Upgrade confirmation failed", 'error');
                    }
                } else {
                    const remainingTime = Math.ceil((upgradeCompletionTime - currentTime) / (60 * 1000));
                    this.log(`Upgrade in progress. Time remaining: ${remainingTime} minutes`, 'info');
                    return;
                }
            }
    
            if (incubationInfo.status === "confirmed" && incubationInfo.nextLevel) {
                if (balance >= incubationInfo.nextLevel.birds) {
                    await this.upgradeEgg(headers);
                } else {
                    this.log(`Not enough birds to upgrade. Need ${incubationInfo.nextLevel.birds} birds`, 'warning');
                }
            } else if (incubationInfo.status === "confirmed") {
                this.log("Maximum level reached", 'info');
            }
        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data === 'Start incubating your egg now') {
                this.log("Start incubating egg now.", 'warning');
                await this.upgradeEgg(headers);
            } else {
                this.log(`Egg upgrade error:  ${error.message}`, 'error');
            }
        }
    }
    
    async upgradeEgg(headers) {
        try {
            const upgradeResponse = await axios.get("https://api.birds.dog/minigame/incubate/upgrade", { headers });
            const upgradeInfo = upgradeResponse.data;
            const upgradeCompletionTime = upgradeInfo.upgradedAt + (upgradeInfo.duration * 60 * 60 * 1000);
            const completionDateTime = new Date(upgradeCompletionTime);
            this.log(`Starting upgrade to level ${upgradeInfo.level}. Completion time: ${completionDateTime.toLocaleString()}`, 'success');
        } catch (error) {
            this.log(`Error while upgrading egg: ${error.message}`, 'error');
        }
    }

    async performTasks(telegramauth) {
        const headers = { 
            ...this.headers, 
            "Telegramauth": `tma ${telegramauth}`
        };

        try {
            const projectResponse = await axios.get("https://api.birds.dog/project", { headers });
            const allTasks = projectResponse.data.flatMap(project => project.tasks);
            
            const userTasksResponse = await axios.get("https://api.birds.dog/user-join-task", { headers });
            const completedTaskIds = userTasksResponse.data.map(task => task.taskId);

            const incompleteTasks = allTasks.filter(task => !completedTaskIds.includes(task._id));

            for (const task of incompleteTasks) {
                try {
                    const payload = {
                        taskId: task._id,
                        channelId: task.channelId || "",
                        slug: task.slug || "none",
                        point: task.point
                    };

                    const joinTaskResponse = await axios.post("https://api.birds.dog/project/join-task", payload, { headers });
                    
                    if (joinTaskResponse.data.msg === "Successfully") {
                        this.log(`Task ${task.title} completed successfully | reward: ${task.point}`, 'success');
                    } else {
                        this.log(`Task ${task.title} failed`, 'error');
                    }
                } catch (error) {
                    // this.log();
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            if (incompleteTasks.length === 0) {
                this.log("All tasks completed", 'info');
            }
        } catch (error) {
            this.log(`Error while performing tasks: ${error.message}`, 'error');
        }
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        const nangcapt = await this.askQuestion('Do you want to upgrade? (y/n): ');
        const hoinangcapt = nangcapt.toLowerCase() === 'y';

        const nhiemvu = await this.askQuestion('Do you want to perform tasks? (y/n): ');
        const hoinhiemvu = nhiemvu.toLowerCase() === 'y';

        while (true) {
            printLogo();
            for (let i = 0; i < data.length; i++) {
                const telegramauth = data[i];
                const userData = JSON.parse(decodeURIComponent(telegramauth.split('user=')[1].split('&')[0]));
                const userId = userData.id;
                const firstName = userData.first_name;

                console.log(`==========  ${i + 1} | ${firstName.green} ==========`);
                
                const apiResult = await this.callAPI(telegramauth);
                if (apiResult) {
                    const balance = apiResult.balance;
                    await this.callWormMintAPI(telegramauth);
                    await this.playEggMinigame(telegramauth);
                    if (hoinangcapt) {
                        this.log(`Starting egg check and upgrade...`, 'info');
                        await this.nangcap(telegramauth, balance);
                    }
                    if (hoinhiemvu) {
                        this.log(`Starting to perform tasks...`, 'info');
                        await this.performTasks(telegramauth);
                    }
                } else {
                    this.log(`API call failed for account ${userId}. Skipping this account.`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(60 * 60);
        }
    }
}

const client = new BirdX();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
//