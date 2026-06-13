package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WorkerRoutingService {

    private final RouterProperties routerProperties;

    public WorkerRoutingService(RouterProperties routerProperties) {
        this.routerProperties = routerProperties;
    }

    // requests get routed to worker nodes based on document id hash 
    // workers are read from application.yaml
    public RouterProperties.Worker workerForDocument(String documentId) {
        List<RouterProperties.Worker> workers = routerProperties.getWorkers();

        if (workers == null || workers.isEmpty()) {
            throw new IllegalStateException("No workers configured");
        }

        // routing rule
        int index = Math.floorMod(documentId.hashCode(), workers.size());
        return workers.get(index);
    }
}