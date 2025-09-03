import { parse } from 'csv-parse';
import * as fs from 'node:fs';
import { from } from 'rxjs';
import { administrativeAreaBBSR, getPool, insertIntoAdministrativeAreaBBSR } from './db';
import { bufferCount, map } from 'rxjs/operators';

function readFromCSV$(path: fs.PathLike) {
	const csvStream = fs.createReadStream(path);
	const parser = csvStream.pipe(
		parse({
			columns: true,
			delimiter: ';',
			from: 2,
			skipRecordsWithError: false,
			skip_empty_lines: true
		})
	);
	return from(parser);
}

readFromCSV$(process.env.BBSR_FILE as fs.PathLike)
	.pipe(
		map((data) =>
			administrativeAreaBBSR.parse({
				area: data.fl23,
				city_and_municipality_type: data.GTU_NAME,
				name: data.GEM_NAME,
				official_municipality_key: data.GEM2023,
				official_regional_code: data.GEM2023_RS,
				population: data.bev23
			})
		),
		bufferCount(1000)
	)
	.subscribe({
		next: async (data) => {
			const pool = await getPool();
			await pool.query(insertIntoAdministrativeAreaBBSR(data));
		},
		error: (err) => {
			console.log(err);
		}
	});
