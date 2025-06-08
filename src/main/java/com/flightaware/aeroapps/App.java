package com.flightaware.aeroapps;

import static spark.Spark.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class App {

    static String AEROAPI_BASE_URL = "https://aeroapi.flightaware.com/aeroapi";
    static String AEROAPI_KEY = System.getenv("AEROAPI_KEY");
    public static final int PORT = Integer.parseInt(System.getenv("PORT"));
    static int CACHE_TIME = Integer.parseInt(System.getenv("CACHE_TIME"));
    static final OkHttpClient client = new OkHttpClient();

    static ObjectMapper mapper = new ObjectMapper();

    static LoadingCache<String, ArrayNode> CACHE = Caffeine.newBuilder()
        .expireAfterWrite(CACHE_TIME, TimeUnit.SECONDS)
        .build(key -> mapper.createArrayNode());

    static LoadingCache<String, ObjectNode> FLIGHT_CACHE = Caffeine.newBuilder()
        .expireAfterWrite(CACHE_TIME, TimeUnit.SECONDS)
        .build(key -> mapper.createObjectNode());

    static final Logger logger = LoggerFactory.getLogger("App");

    public static void main(String[] args) {
        port(5000);

        before((req, res) -> res.type("application/json"));

        notFound((req, res) -> "{\"error\":\"Not Found\"}");

        get("/positions/:faFlightId", (req, res) ->
            get_positions(req.params("faFlightId")), new RenderJson()
        );
        get("/flights/", (req, res) ->
            get_flight_random(), new RenderJson()
        );
        get("/flights/:faFlightId", (req, res) ->
            get_flight(req.params("faFlightId")), new RenderJson()
        );
        get("/airports/", (req, res) ->
            get_busiest_airports(), new RenderJson()
        );
        get("/airports/:airport/arrivals", (req, res) ->
            airport_arrivals(req.params("airport")), new RenderJson()
        );
        get("/airports/:airport/departures", (req, res) ->
            airport_departures(req.params("airport")), new RenderJson()
        );
        get("/airports/:airport/enroute", (req, res) ->
            airport_enroute(req.params("airport")), new RenderJson()
        );
        get("/airports/:airport/scheduled", (req, res) ->
            airport_scheduled(req.params("airport")), new RenderJson()
        );
        get("/map/:faFlightId", (req, res) ->
            get_map(req.params("faFlightId"))
        );
    }

    static class RenderJson implements spark.ResponseTransformer {
        @Override
        public String render(Object node) {
            String json = "";
            try {
                json = mapper.writeValueAsString(node);
            } catch (Exception e) {
                logger.error(e.getMessage());
                json = String.format(
                    "{\"title\":\"%s\", \"detail\":\"%s\"}", 
                    e.getClass().getSimpleName(), e.getMessage()
                );
                halt(500, json);
            }
            return json;
        }
    }

    private static JsonNode aeroapi_get(String resource) {
        int code = 500;
        ObjectNode result = mapper.createObjectNode();

        Request request = new Request.Builder()
            .header("x-apikey", AEROAPI_KEY)
            .url(String.format("%s%s", AEROAPI_BASE_URL, resource))
            .build();

        try {
            Response response = client.newCall(request).execute();
            code = response.code();
            result = (ObjectNode) mapper.readTree(response.body().string());
        } catch (Exception e) {
            result.put("title", e.getClass().getSimpleName());
            result.put("detail", e.getMessage());
        }

        result.put("status", code);
        return result;
    }

    private static JsonNode boards_request(String apiResource, String apiObjectKey) {
        ArrayNode flights = mapper.createArrayNode();
        ArrayNode idList = CACHE.get(apiResource);

        if (idList.size() > 0) {
            idList.forEach(faFlightId -> {
                ObjectNode entry = FLIGHT_CACHE.get(faFlightId.asText());
                if (entry.size() > 0) {
                    flights.add(entry);
                }
            });
        }

        if (flights.size() >= 15) {
            logger.info("Populating {} from cache", apiResource);
        } else {
            logger.info("Making AeroAPI request to GET {}", apiResource);
            JsonNode response = aeroapi_get(apiResource);

            if (response.get("status").asInt() != 200) {
                logger.error(response.toString());
                halt(response.get("status").asInt(), response.toString());
            }

            JsonNode payload = format_response(response, apiObjectKey);
            payload.forEach(entry -> {
                ObjectNode node = (ObjectNode) entry;
                FLIGHT_CACHE.put(node.get("id").asText(), node);
                flights.add(node);
                idList.add(node.get("id").asText());
            });
            CACHE.put(apiResource, idList);
        }

        return flights;
    }

    private static JsonNode format_response(JsonNode rawPayload, String topLevel) {

        List<String> missing = Arrays.asList(
            "actual_runway_off", "actual_runway_on", "cruising_altitude", "filed_ground_speed",
            "hexid", "predicted_in", "predicted_off", "predicted_on", "predicted_out",
            "status", "true_cancel"
        );
        List<String> origDest = Arrays.asList("destination", "origin");
        Map<String, String> rename = Map.of(
            "ident", "flight_number",
            "filed_airspeed", "filed_speed",
            "fa_flight_id", "id",
            "gate_origin", "actual_departure_gate",
            "gate_destination", "actual_arrival_gate",
            "terminal_origin", "actual_departure_terminal",
            "terminal_destination", "actual_arrival_terminal"
        );

        ArrayNode formatted = mapper.createArrayNode();

        rawPayload.get(topLevel).forEach(entry -> {
            ObjectNode node = (ObjectNode) entry;
            missing.forEach(key -> node.putNull(key));
            origDest.forEach(key ->
                node.put(key, node.get(key).get("code"))
            );
            rename.forEach((key, value) ->
                node.put(value, node.remove(key))
            );
            formatted.add(node);
        });

        if (topLevel == "flights") {
            return formatted.get(0);
        }

        return formatted;
    }

    private static JsonNode get_positions(String faFlightId) {
        String apiResource = String.format("/flights/%s/track", faFlightId);
        ArrayNode postions = CACHE.get(apiResource);

        if (postions.size() > 0) {
            logger.info("Populating {} from cache", apiResource);
        } else {
            logger.info("Making AeroAPI request to GET {}", apiResource);
            JsonNode response = aeroapi_get(apiResource);

            if (response.get("status").asInt() != 200) {
                logger.error(response.toString());
                halt(response.get("status").asInt(), response.toString());
            }

            postions = (ArrayNode) response.get("positions");
            CACHE.put(apiResource, postions);
        }

        return postions;
    }

    private static JsonNode get_flight(String faFlightId) {
        String apiResource = String.format("/flights/%s", faFlightId);
        ObjectNode flight = FLIGHT_CACHE.get(faFlightId);

        if (flight.size() > 0) {
            logger.info("Populating {} from cache", apiResource);
        } else {
            logger.info("Making AeroAPI request to GET {}", apiResource);
            JsonNode response = aeroapi_get(apiResource);

            if (response.get("status").asInt() != 200) {
                logger.error(response.toString());
                halt(response.get("status").asInt(), response.toString());
            }

            flight = (ObjectNode) format_response(response, "flights");
            FLIGHT_CACHE.put(faFlightId, flight);
        }

        return flight;
    }

    private static JsonNode get_flight_random() {
        String apiResource = "/flights/search?query=-inAir 1";
        ArrayNode flights = CACHE.get(apiResource);
        Random rand = new Random();
        
        if (flights.size() > 0) {
            logger.info("Populating {} from cache", apiResource);
        } else {
            logger.info("Making AeroAPI request to GET {}", apiResource);
            JsonNode response = aeroapi_get(apiResource);

            if (response.get("status").asInt() != 200) {
                logger.error(response.toString());
                halt(response.get("status").asInt(), response.toString());
            }

            response.get("flights").forEach(entry ->
                flights.add(entry.get("faFlightId").asText())
            );
            CACHE.put(apiResource, flights);
        }

        return get_flight(flights.get(rand.nextInt(flights.size())).asText());
    }

    private static JsonNode get_busiest_airports() {
        String apiResource = "/disruption_counts/origin";
        ArrayNode airports = CACHE.get(apiResource);

        if (airports.size() > 0) {
            logger.info("Populating {} from cache", apiResource);
        } else {
            logger.info("Making AeroAPI request to GET {}", apiResource);
            JsonNode response = aeroapi_get(apiResource);

            if (response.get("status").asInt() != 200) {
                logger.error(response.toString());
                halt(response.get("status").asInt(), response.toString());
            }

            response.get("entities").forEach(entry ->
                airports.add(entry.get("entity_id").asText())
            );
            CACHE.put(apiResource, airports);
        }

        return airports;
    }

    private static JsonNode airport_arrivals(String airport) {
        String apiResource = String.format("/airports/%s/flights/arrivals", airport);
        return boards_request(apiResource, "arrivals");
    }

    private static JsonNode airport_departures(String airport) {
        String apiResource = String.format("/airports/%s/flights/departures", airport);
        return boards_request(apiResource, "departures");
    }

    private static JsonNode airport_enroute(String airport) {
        String apiResource = String.format("/airports/%s/flights/scheduled_arrivals", airport);
        return boards_request(apiResource, "scheduled_arrivals");
    }

    private static JsonNode airport_scheduled(String airport) {
        String apiResource = String.format("/airports/%s/flights/scheduled_departures", airport);
        return boards_request(apiResource, "scheduled_departures");
    }

    private static String get_map(String faFlightId) {
        String apiResource = String.format("/flights/%s/map", faFlightId);
        ArrayNode map = CACHE.get(apiResource);

        if (map.size() > 0) {
            logger.info("Populating {} from cache", apiResource);
        } else {
            logger.info("Making AeroAPI request to GET {}", apiResource);
            JsonNode response = aeroapi_get(apiResource);

            if (response.get("status").asInt() != 200) {
                logger.error(response.toString());
                halt(response.get("status").asInt(), response.toString());
            }

            map.add(response.get("map"));
            CACHE.put(apiResource, map);
        }

        return map.get(0).asText();
    }
}
