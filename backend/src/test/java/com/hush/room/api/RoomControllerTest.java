package com.hush.room.api;

import com.fasterxml.jackson.databind.ObjectMapper;


import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
class RoomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/rooms with DIRECT type creates a 2-person room")
    void testCreateDirectRoom() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "type", "DIRECT",
            "ttlMinutes", 60
        ));

        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roomCode", notNullValue()))
                .andExpect(jsonPath("$.type").value("DIRECT"))
                .andExpect(jsonPath("$.maxParticipants").value(2))
                .andExpect(jsonPath("$.state").value("ACTIVE"))
                .andExpect(jsonPath("$.createdAt", notNullValue()))
                .andExpect(jsonPath("$.expiresAt", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/rooms with GROUP type creates a 20-person room")
    void testCreateGroupRoom() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "type", "GROUP",
            "ttlMinutes", 180
        ));

        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("GROUP"))
                .andExpect(jsonPath("$.maxParticipants").value(20));
    }

    @Test
    @DisplayName("Invalid or unsupported ttlMinutes are rejected with 400 Bad Request")
    void testInvalidTtlMinutes() throws Exception {
        int[] invalidTtls = {0, -1, 31, 120, 181};

        for (int ttl : invalidTtls) {
            String body = objectMapper.writeValueAsString(Map.of(
                "type", "DIRECT",
                "ttlMinutes", ttl
            ));

            mockMvc.perform(post("/api/rooms")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("BAD_REQUEST"));
        }
    }

    @Test
    @DisplayName("Missing type or ttlMinutes fields return 400 Bad Request")
    void testMissingFields() throws Exception {
        // Missing ttlMinutes
        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"DIRECT\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));

        // Missing type
        mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ttlMinutes\":60}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("GET /api/rooms/{roomCode} returns room metadata for existing room")
    void testGetExistingRoom() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 30));
        MvcResult createResult = mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        String responseJson = createResult.getResponse().getContentAsString();
        String code = objectMapper.readTree(responseJson).get("roomCode").asText();

        // Get room using code
        mockMvc.perform(get("/api/rooms/" + code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value(code))
                .andExpect(jsonPath("$.type").value("DIRECT"))
                .andExpect(jsonPath("$.maxParticipants").value(2))
                .andExpect(jsonPath("$.participantCount").value(0))
                .andExpect(jsonPath("$.state").value("ACTIVE"));

        // Get room using lowercase code (normalization test)
        mockMvc.perform(get("/api/rooms/" + code.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value(code));
    }

    @Test
    @DisplayName("GET /api/rooms/ABCDEF for unknown room returns 404 Not Found")
    void testGetUnknownRoom() throws Exception {
        mockMvc.perform(get("/api/rooms/ABCDEF"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ROOM_NOT_FOUND"))
                .andExpect(jsonPath("$.message", containsString("ABCDEF")));
    }

    @Test
    @DisplayName("POST /api/rooms/{code}/participants joins room and assigns host=true to first participant")
    void testJoinRoomFirstParticipant() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 60));
        MvcResult createResult = mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        String code = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("roomCode").asText();

        String joinBody = objectMapper.writeValueAsString(Map.of("username", "Conan"));
        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(joinBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantId", notNullValue()))
                .andExpect(jsonPath("$.username").value("Conan"))
                .andExpect(jsonPath("$.host").value(true))
                .andExpect(jsonPath("$.joinedAt", notNullValue()));
    }

    @Test
    @DisplayName("Second participant joining DIRECT room receives host=false")
    void testSecondParticipantJoin() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 60));
        String code = objectMapper.readTree(
            mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(createBody))
                    .andReturn().getResponse().getContentAsString()
        ).get("roomCode").asText();

        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "Conan"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.host").value(true));

        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "Alex"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.host").value(false));
    }

    @Test
    @DisplayName("Joining a full DIRECT room returns 409 Conflict")
    void testFullRoomJoinConflict() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 60));
        String code = objectMapper.readTree(
            mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(createBody))
                    .andReturn().getResponse().getContentAsString()
        ).get("roomCode").asText();

        // Join participant 1 & 2
        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "User1"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "User2"))))
                .andExpect(status().isCreated());

        // Attempt participant 3 -> 409 Conflict
        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "User3"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("ROOM_FULL"));
    }

    @Test
    @DisplayName("Joining unknown room returns 404 Not Found")
    void testJoinUnknownRoom() throws Exception {
        mockMvc.perform(post("/api/rooms/ABCDEF/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "Conan"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ROOM_NOT_FOUND"));
    }

    @Test
    @DisplayName("Invalid usernames (blank, null, >32 chars) return 400 Bad Request")
    void testInvalidUsernames() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 60));
        String code = objectMapper.readTree(
            mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(createBody))
                    .andReturn().getResponse().getContentAsString()
        ).get("roomCode").asText();

        // Blank
        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"   \"}"))
                .andExpect(status().isBadRequest());

        // Too long (>32 chars)
        String longUsername = "a".repeat(33);
        mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", longUsername))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /api/rooms/{code}/participants/{id} removes participant and returns 204 No Content")
    void testRemoveParticipant() throws Exception {
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 60));
        String code = objectMapper.readTree(
            mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(createBody))
                    .andReturn().getResponse().getContentAsString()
        ).get("roomCode").asText();

        String joinResult = mockMvc.perform(post("/api/rooms/" + code + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", "Conan"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String participantId = objectMapper.readTree(joinResult).get("participantId").asText();

        // Delete participant
        mockMvc.perform(delete("/api/rooms/" + code + "/participants/" + participantId))
                .andExpect(status().isNoContent());

        // Deleting unknown participant returns 404
        mockMvc.perform(delete("/api/rooms/" + code + "/participants/" + participantId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ROOM_NOT_FOUND"));
    }

    @Test
    @DisplayName("Integration Test — Full HTTP flow: POST room -> POST participant -> GET room")
    void testFullIntegrationFlow() throws Exception {
        // 1. Create Room
        String createBody = objectMapper.writeValueAsString(Map.of("type", "DIRECT", "ttlMinutes", 60));
        String createRes = mockMvc.perform(post("/api/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String roomCode = objectMapper.readTree(createRes).get("roomCode").asText();

        // 2. Join Participant
        String joinBody = objectMapper.writeValueAsString(Map.of("username", "Conan"));
        mockMvc.perform(post("/api/rooms/" + roomCode + "/participants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(joinBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantId", notNullValue()))
                .andExpect(jsonPath("$.host").value(true));

        // 3. GET Room Metadata and verify participantCount = 1
        mockMvc.perform(get("/api/rooms/" + roomCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value(roomCode))
                .andExpect(jsonPath("$.type").value("DIRECT"))
                .andExpect(jsonPath("$.participantCount").value(1));
    }
}
