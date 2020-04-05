import fs from "fs";
import path from "path";
import { promisify } from "util";
const parse = require('csv-parse/lib/sync');


const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readDir = promisify(fs.readdir);

exec().then(() => console.info("done"));

async function exec() {

    const dataSet = await readData();
    const waDayData = await getWAData(dataSet);
    const waValues = await compute(waDayData);

    const nyDayData = await getNYData(dataSet);
    const nyValues = await compute(nyDayData);

    await writeFile("./data.js", "var wa_data = " + JSON.stringify(waValues, null, 4)
    + "\nvar ny_data = " + JSON.stringify(nyValues, null, 4));
}

async function getWAData(dataSet: {
    date: string;
    path: string;
}[]) {
    const dayData: any[][] = [];
    for (const item of dataSet) {

        const dayItem = (await readFile(item.path)).toString();

        const d = parse(dayItem) as string[][];

        //6, 8, 
        // check mode
        if (d[0].length === 6 || d[0].length === 8) {

            const lines = d
                .filter((line, index) => {
                    if (line[1] != "US") return undefined;
                    if (line[0] === "Washington") return line;
                    if (line[0].endsWith(", WA")) return line;

                    return undefined;
                });

            const dataPoints = lines.reduce((dp, item) => {
                dp[1] += (item[3] ? parseInt(item[3]) : 0);
                dp[2] += (item[4] ? parseInt(item[4]) : 0);
                dp[3] += (item[5] ? parseInt(item[5]) : 0);
                return dp;
            }, [item.date, 0, 0, 0] as any[]);

            dayData.push(dataPoints);

        } else {

            const lines = d
                .filter((line, index) => {
                    if (line[3] != "US") return undefined;
                    if (line[2] === "Washington") return line;
                    return undefined;
                });


            const dataPoints = lines.reduce((dp, item) => {
                dp[1] += parseInt(item[7]);
                dp[2] += parseInt(item[8]);
                dp[3] += parseInt(item[9]);
                return dp;
            }, [item.date, 0, 0, 0] as any[]);

            dayData.push(dataPoints);
        }
    }

    return dayData;
}

async function getNYData(dataSet: {
    date: string;
    path: string;
}[]) {


    const dayData: any[][] = [];
    for (const item of dataSet) {

        const dayItem = (await readFile(item.path)).toString();

        const d = parse(dayItem) as string[][];

        //6, 8, 
        // check mode
        if (d[0].length === 6 || d[0].length === 8) {

            const lines = d
                .filter((line, index) => {
                    if (line[1] != "US") return undefined;
                    if (line[0] === "New Jersey") return line;
                    if (line[0] === "New York") return line;
                    return undefined;
                });

            const dataPoints = lines.reduce((dp, item) => {
                dp[1] += (item[3] ? parseInt(item[3]) : 0);
                dp[2] += (item[4] ? parseInt(item[4]) : 0);
                dp[3] += (item[5] ? parseInt(item[5]) : 0);
                return dp;
            }, [item.date, 0, 0, 0] as any[]);

            dayData.push(dataPoints);

        } else {

            const lines = d
                .filter((line, index) => {
                    if (line[3] != "US") return undefined;

                    if (line[2] === "New York") {
                        if (line[1] === "Westchester") return line;
                        if (line[1] === "Bronx") return line;
                        if (line[1] === "New York City") return line;
                        if (line[1] === "Kings") return line;
                        if (line[1] === "Richmond") return line;
                        if (line[1] === "Queens") return line;
                    };
                    if (line[2] === "New Jersey") {
                        if (line[1] === "Bergen") return line;
                        if (line[1] === "Hudson") return line;
                        if (line[1] === "Passaic") return line;
                        if (line[1] === "Essex") return line;
                        if (line[1] === "Union") return line;
                    };
                    return undefined;
                });


            const dataPoints = lines.reduce((dp, item) => {
                dp[1] += parseInt(item[7]);
                dp[2] += parseInt(item[8]);
                dp[3] += parseInt(item[9]);
                return dp;
            }, [item.date, 0, 0, 0] as any[]);

            dayData.push(dataPoints);
        }
    }

    return dayData;
}

async function readData() {
    console.info("reading data");

    const dir = path.resolve("data", "csse_covid_19_data", "csse_covid_19_daily_reports");

    const files = await readDir(dir);

    return files
        .filter(item => item.endsWith(".csv"))
        .map(item => {

            const dts = new Date(item.substr(0, item.length - 4)).toDateString();

            return {
                date: dts.substring(0, dts.length - 5),
                path: path.resolve(dir, item)
            }
        });
}

async function compute(dayData: any[][]) {

    const values = dayData.reduce((vals, item, index) => {

        if (item[1] > 1) {
            vals.labels.push(item[0]);
            vals.confirmed.push(item[1]);
            vals.deaths.push(item[2]);
            vals.recovered.push(item[3]);
        }

        return vals;
    }, { labels: [], confirmed: [], recovered: [], deaths: [], dconfirmed: [], drecovered: [], ddeaths: [] } as { labels: string[], confirmed: number[], recovered: number[], deaths: number[], dconfirmed: number[], drecovered: number[], ddeaths: number[] });

    values.dconfirmed.push(0);
    values.ddeaths.push(0);
    values.drecovered.push(0);

    for (let index = 1; index < values.confirmed.length; index++) {
        values.dconfirmed.push(values.confirmed[index] - values.confirmed[index - 1]);
        values.ddeaths.push(values.deaths[index] - values.deaths[index - 1]);
        values.drecovered.push(values.recovered[index] - values.recovered[index - 1]);
    }

    return values;
}


