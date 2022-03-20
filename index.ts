import fs from "fs";
import path from "path";
import { promisify } from "util";
const parse = require('csv-parse/lib/sync');




const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readDir = promisify(fs.readdir);

interface DataValues {
    confirmed: number[],
    recovered: number[],
    deaths: number[],
    dconfirmed: number[],
    drecovered: number[],
    ddeaths: number[]
}

interface DataSet {
    labels: string[],
    main: DataValues,
    focus: DataValues
}

exec().then(() => console.info("done"));

async function exec() {

    const dataSet = await readData();

    console.info(JSON.stringify(dataSet, null, 2));

    const waDayData = await getWAData(dataSet);
    const waValues = await compute(waDayData);

    const nyDayData = await getNYData(dataSet);
    const nyValues = await compute(nyDayData);

    await writeFile("./data.js", "var wa_data = " + JSON.stringify(waValues, null, 4)
        + "\nvar ny_data = " + JSON.stringify(nyValues, null, 4)
    );
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

                // dp[4] = dp[1];
                // dp[5] = dp[2];
                // dp[6] = dp[3];

                return dp;
            }, [item.date, 0, 0, 0, 0, 0, 0] as any[]);

            dayData.push(dataPoints);

        } else {

            const lines = d
                .filter((line, index) => {
                    if (line[3] != "US") return undefined;
                    if (line[2] == "Washington") return line;
                    return undefined;
                });


            const dataPoints = lines.reduce((dp, item) => {
                dp[1] += parseInt(item[7]);
                dp[2] += parseInt(item[8]);
                dp[3] += parseInt(item[9]);

                if (item[1] === "King") {
                    dp[4] += parseInt(item[7]);
                    dp[5] += parseInt(item[8]);
                    dp[6] += parseInt(item[9]);
                }

                return dp;
            }, [item.date, 0, 0, 0, 0, 0, 0] as any[]);

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
            }, [item.date, 0, 0, 0, 0, 0, 0] as any[]);

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
            }, [item.date, 0, 0, 0, 0, 0, 0] as any[]);

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

            const dts = new Date(item.substr(0, item.length - 4)).toISOString();
            console.info(dts);

            return {
                date: dts.substring(0, 10),
                path: path.resolve(dir, item)
            }
        }).sort((a, b) => a.date < b.date ? -1 : 1);
}

async function compute(dayData: any[][]) {

    const values = dayData.reduce((vals, item, index) => {

        if (item[1] > 1) {
            vals.labels.push(item[0]);

            vals.main.confirmed.push(item[1]);
            vals.main.deaths.push(item[2]);
            vals.main.recovered.push(item[3]);

            vals.focus.confirmed.push(item[4]);
            vals.focus.deaths.push(item[5]);
            vals.focus.recovered.push(item[6]);
        }

        return vals;
    }, {
        labels: [],
        main: {
            confirmed: [],
            recovered: [],
            deaths: [],
            dconfirmed: [],
            drecovered: [],
            ddeaths: []
        },
        focus: {
            confirmed: [],
            recovered: [],
            deaths: [],
            dconfirmed: [],
            drecovered: [],
            ddeaths: []
        }
    } as
    DataSet);

    computeDiffs(values.main);
    computeDiffs(values.focus);

    return values;

    function computeDiffs(values: DataValues) {
        values.dconfirmed.push(0);
        values.ddeaths.push(0);
        values.drecovered.push(0);

        for (let index = 1; index < values.confirmed.length; index++) {
            values.dconfirmed.push(values.confirmed[index] - values.confirmed[index - 1]);
            values.ddeaths.push(values.deaths[index] - values.deaths[index - 1]);
            values.drecovered.push(values.recovered[index] - values.recovered[index - 1]);
        }
    }
}


