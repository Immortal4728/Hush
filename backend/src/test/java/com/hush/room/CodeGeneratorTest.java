package com.hush.room;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CodeGeneratorTest {

    private CodeGenerator codeGenerator;

    @BeforeEach
    void setUp() {
        codeGenerator = new CodeGenerator();
    }

    @Test
    @DisplayName("Generated code must have length of 6")
    void testCodeLengthIsSix() {
        String code = codeGenerator.generateCode();
        assertNotNull(code);
        assertEquals(6, code.length());
    }

    @Test
    @DisplayName("Generated code characters must all belong to approved alphabet")
    void testApprovedAlphabet() {
        for (int i = 0; i < 100; i++) {
            String code = codeGenerator.generateCode();
            for (char c : code.toCharArray()) {
                assertTrue(CodeGenerator.APPROVED_ALPHABET.indexOf(c) >= 0,
                        "Character '" + c + "' is not in approved alphabet");
            }
        }
    }

    @Test
    @DisplayName("Forbidden characters (0, O, 1, I, L) must never appear")
    void testForbiddenCharacters() {
        Set<Character> forbidden = Set.of('0', 'O', '1', 'I', 'L', 'l', 'o', 'i');
        for (int i = 0; i < 500; i++) {
            String code = codeGenerator.generateCode();
            for (char c : code.toCharArray()) {
                assertFalse(forbidden.contains(c),
                        "Forbidden character found: " + c);
            }
        }
    }

    @Test
    @DisplayName("Multiple generated codes should produce varied outputs")
    void testVariedOutputs() {
        Set<String> set = new HashSet<>();
        for (int i = 0; i < 50; i++) {
            set.add(codeGenerator.generateCode());
        }
        assertTrue(set.size() > 1, "Generated codes should not all be identical");
    }

    @Test
    @DisplayName("Generation works repeatedly without throwing exceptions")
    void testRepeatedGeneration() {
        assertDoesNotThrow(() -> {
            for (int i = 0; i < 1000; i++) {
                codeGenerator.generateCode();
            }
        });
    }
}
