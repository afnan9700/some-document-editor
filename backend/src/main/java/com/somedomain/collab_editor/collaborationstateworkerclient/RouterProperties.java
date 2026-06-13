package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "router")
public class RouterProperties {

    private String workerBearerToken;
    private String springbootBearerToken;
    private List<Worker> workers = new ArrayList<>();

    public String getWorkerBearerToken() {
        return workerBearerToken;
    }

    public void setWorkerBearerToken(String workerBearerToken) {
        this.workerBearerToken = workerBearerToken;
    }

    public String getSpringbootBearerToken() {
        return springbootBearerToken;
    }

    public void setSpringbootBearerToken(String springbootBearerToken) {
        this.springbootBearerToken = springbootBearerToken;
    }

    public List<Worker> getWorkers() {
        return workers;
    }

    public void setWorkers(List<Worker> workers) {
        this.workers = workers;
    }

    public static class Worker {
        private String id;
        private String baseUrl;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }
}