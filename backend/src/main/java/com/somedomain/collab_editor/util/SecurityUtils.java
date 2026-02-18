package com.somedomain.collab_editor.util;

import org.springframework.security.core.context.SecurityContextHolder;
import com.somedomain.collab_editor.auth.User;

public class SecurityUtils {
    public static User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User)) {   // not authenticated
            return null;
        }
        return (User) auth.getPrincipal();  // because getPrincipal() returns UserDetails
    }
}
