package com.hush.room.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
class RoomApiContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoomService roomService;

    @Test
    @DisplayName("POST /api/rooms - Direct room creation contract")
    void testCreateDirectRoomContract() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "type", "DIRECT",
            "ttlMinutes", 60
        ));

        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roomCode", matchesPattern("^[2-9A-HJKMNP-Z]{6}$")))
                .andExpect(jsonPath("$.type").value("DIRECT"))
                .andExpect(jsonPath("$.maxParticipants").value(2))
                .andExpect(jsonPath("$.expiresAt", notNullValue()))
                .andExpect(jsonPath("$.state").value("ACTIVE"))
                .andExpect(jsonPath("$.createdAt", notNullValue()))
                .andExpect(jsonPath("$.participants").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/rooms - Group room creation contract")
    void testCreateGroupRoomContract() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "type", "GROUP",
            "ttlMinutes", 180
        ));

        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("GROUP"))
                .andExpect(jsonPath("$.maxParticipants").value(20))
                .andExpect(jsonPath("$.state").value("ACTIVE"));
    }

    @Test
    @DisplayName("POST /api/rooms - Invalid request validation & error response format")
    void testCreateRoomValidation() throws Exception {
        // Missing type
        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ttlMinutes\":60}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message", notNullValue()));

        // Invalid TTL
        String body = objectMapper.writeValueAsString(Map.of(
            "type", "DIRECT",
            "ttlMinutes", 45
        ));
        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("ttlMinutes must be one of [30, 60, 180]"));
    }

    @Test
    @DisplayName("GET /api/rooms/{code} - Room status lookup contract")
    void testRoomLookupContract() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 30));
        MvcResult createResult = mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        String code = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("roomCode").asText();

        mockMvc.perform(get("/api/rooms/" + code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true))
                .andExpect(jsonPath("$.roomCode").value(code))
                .andExpect(jsonPath("$.type").value("DIRECT"))
                .andExpect(jsonPath("$.maxParticipants").value(2))
                .andExpect(jsonPath("$.participantCount").value(0))
                .andExpect(jsonPath("$.expiresAt", notNullValue()))
                .andExpect(jsonPath("$.state").value("ACTIVE"))
                .andExpect(jsonPath("$.webSocketSession").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/rooms/{code} - Unknown room lookup returns 404 ErrorResponse")
    void testUnknownRoomLookup() throws Exception {
        mockMvc.perform(get("/api/rooms/NONEX1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"))
                .andExpect(jsonPath("$.message", containsString("NONEX1")));
    }

    @Test
    @DisplayName("GET /api/rooms/{code} - Destroyed/Expired room lookup returns 404 ErrorResponse")
    void testExpiredRoomLookup() throws Exception {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofSeconds(1));
        room.markDestroyed();

        mockMvc.perform(get("/api/rooms/" + room.getRoomCode()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Room does not exist or has expired."));
    }

    @Test
    @DisplayName("CORS preflight request for allowed dev origin http://localhost:5173")
    void testCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/rooms")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
