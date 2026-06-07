package protocol

type ChatPayload struct {
	Text string `json:"text"`
}

type ConnectionAckPayload struct {
	DocumentID      int64  `json:"documentId"`
	UserID          int64  `json:"userId"`
	PermissionLevel string `json:"permissionLevel"`
	Message         string `json:"message"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ParticipantEventPayload struct {
	DocumentID      int64  `json:"documentId"`
	UserID          int64  `json:"userId"`
	PermissionLevel string `json:"permissionLevel"`
	Message         string `json:"message"`
}
