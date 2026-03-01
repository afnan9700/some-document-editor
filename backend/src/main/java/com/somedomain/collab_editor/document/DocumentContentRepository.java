package com.somedomain.collab_editor.document;

import org.springframework.data.jpa.repository.JpaRepository;

interface DocumentContentRepository extends JpaRepository<DocumentContent, Long> {
    
}