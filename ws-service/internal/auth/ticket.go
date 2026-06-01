package auth

import "time"

type PermissionLevel string

type TicketPayload struct {
	DocumentID      int64           `json:"documentId"`
	UserID          int64           `json:"userId"`
	PermissionLevel PermissionLevel `json:"permissionLevel"`
	IssuedAt        time.Time       `json:"issuedAt"`
	ExpiresAt       time.Time       `json:"expiresAt"`
}

type TicketResponse struct {
	Ticket    string    `json:"ticket"`
	ExpiresAt time.Time `json:"expiresAt"`
}
