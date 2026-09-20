package com.hush.room;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class CodeGenerator {

    public static final String APPROVED_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    public static final int CODE_LENGTH = 6;

    private final SecureRandom random = new SecureRandom();

    public String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = random.nextInt(APPROVED_ALPHABET.length());
            sb.append(APPROVED_ALPHABET.charAt(index));
        }
        return sb.toString();
    }
}
