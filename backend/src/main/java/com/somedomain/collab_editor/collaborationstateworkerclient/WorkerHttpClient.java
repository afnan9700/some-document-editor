package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Service
public class WorkerHttpClient {

    private final RestClient restClient;  // main object for making http requests (synchronous)
    private final WorkerRoutingService routingService;  
    private final RouterProperties routerProperties;  // for auth token

    public WorkerHttpClient(RestClient.Builder restClientBuilder,
                            WorkerRoutingService routingService,
                            RouterProperties routerProperties) {
        this.restClient = restClientBuilder.build();  // dont know why 'Builder' and 'build()'
        this.routingService = routingService;
        this.routerProperties = routerProperties;
    }

    public ProxyResponse put(String documentId, String path, Object requestBody) {
        URI uri = workerUri(documentId, path);

        try {
            ResponseEntity<byte[]> entity = restClient.put()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, workerBearerHeader())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(byte[].class);

            return new ProxyResponse(entity.getStatusCode(), entity.getBody());
        } catch (RestClientResponseException ex) {
            return new ProxyResponse(ex.getStatusCode(), ex.getResponseBodyAsByteArray());
        }
    }

    public ProxyResponse put(String documentId, String path) {
        URI uri = workerUri(documentId, path);

        try {
            ResponseEntity<byte[]> entity = restClient.put()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, workerBearerHeader())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .toEntity(byte[].class);

            return new ProxyResponse(entity.getStatusCode(), entity.getBody());
        } catch (RestClientResponseException ex) {
            return new ProxyResponse(ex.getStatusCode(), ex.getResponseBodyAsByteArray());
        }
    }

    private URI workerUri(String documentId, String path) {
        RouterProperties.Worker worker = routingService.workerForDocument(documentId);
        String normalizedPath = path.startsWith("/") ? path : "/" + path;

        return UriComponentsBuilder
                .fromUriString(worker.getBaseUrl())
                .path(normalizedPath)
                .build()
                .toUri();
    }

    private String workerBearerHeader() {
        String token = routerProperties.getWorkerBearerToken();
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("router.worker-bearer-token is not configured");
        }
        return "Bearer " + token;
    }
}