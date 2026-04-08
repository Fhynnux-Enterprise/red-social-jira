const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
    type: "postgres",
    host: "aws-1-us-east-2.pooler.supabase.com",
    port: 5432,
    username: "postgres.suobziwlikwzfevmappo",
    password: "F1d5g6q7gG#",
    database: "postgres",
    ssl: { rejectUnauthorized: false }
});

AppDataSource.initialize()
    .then(async () => {
        console.log("Connected. Dropping FKs...");
        try {
            await AppDataSource.query(`
                ALTER TABLE "job_applications" DROP CONSTRAINT IF EXISTS "FK_1c6cb0f7e44a4755106e22dd04b";
                ALTER TABLE "job_applications" DROP CONSTRAINT IF EXISTS "FK_jobOfferId";
            `);
            console.log("FK dropped.");
        } catch (e) {
            console.error("Error dropping FK:", e.message);
        }
        
        try {
            await AppDataSource.query(`
                ALTER TABLE "job_applications" DROP CONSTRAINT IF EXISTS "FK_b213b1abceec653198cd690a6e3";
            `);
            console.log("FK 2 dropped.");
        } catch (e) {}

        try {
           // We can just drop the tables completely and let TypeORM recreate them if it's fine for dev
           // Since it's a dev branch and the tables are job_offer and job_applications, it's the easiest.
           await AppDataSource.query(`DROP TABLE IF EXISTS "job_applications" CASCADE`);
           await AppDataSource.query(`DROP TABLE IF EXISTS "job_offer" CASCADE`);
           await AppDataSource.query(`DROP TABLE IF EXISTS "professional_profile" CASCADE`);
           console.log("Tables dropped, ready for TypeOrm sync.");
        } catch (e) {
            console.error("Error dropping tables", e);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.log("Error: ", error)
        process.exit(1);
    });
