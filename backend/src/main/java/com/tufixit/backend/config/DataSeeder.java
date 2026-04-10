package com.tufixit.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    @Override
    public void run(String... args) {
        System.out.println("DataSeeder: skipping auto seed");
    }
}