const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running At http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const stateDbToResponseDb = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const districtDbToResponseDb = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT *
                            FROM state;`;
  const states = await database.all(getStatesQuery);
  response.send(states.map((eachState) => stateDbToResponseDb(eachState)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesQuery = `SELECT *
                            FROM state
                            WHERE state_id = ${stateId};`;
  const state = await database.get(getStatesQuery);
  response.send(stateDbToResponseDb(state));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `INSERT INTO district
                                (district_name,state_id,cases,cured,active,deaths)
                        VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await database.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictsQuery = `SELECT *
                                FROM district
                                WHERE district_id = ${districtId};`;
  const district = await database.get(getDistrictsQuery);
  response.send(districtDbToResponseDb(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictsQuery = `DELETE FROM district
                                WHERE district_id = ${districtId};`;
  await database.run(getDistrictsQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `UPDATE district
                                SET
                                district_name = '${districtName}',
                                state_id = ${stateId},
                                cases = ${cases},
                                cured = ${cured},
                                active = ${active},
                                deaths = ${deaths}
                            WHERE district_id = ${districtId};`;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateStatsQuery = `SELECT SUM(cases) AS totalCases,
                                        SUM(cured) AS totalCured,
                                        SUM(active) AS totalActive,
                                        SUM(deaths) AS totalDeaths
                                FROM district
                                WHERE state_id = ${stateId};`;
  const statesStats = await database.get(stateStatsQuery);
  response.send({
    totalCases: statesStats.totalCases,
    totalCured: statesStats.totalCured,
    totalActive: statesStats.totalActive,
    totalDeaths: statesStats.totalDeaths,
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `SELECT state_name
                            FROM state
                            JOIN district ON state.state_id = district.state_id
                            WHERE district_id = ${districtId};`;
  const stateName = await database.get(stateNameQuery);
  response.send({ stateName: stateName.state_name });
});

module.exports = app;
