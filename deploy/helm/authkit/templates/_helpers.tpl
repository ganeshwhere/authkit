{{- define "authkit.name" -}}
authkit
{{- end -}}

{{- define "authkit.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "authkit.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "authkit.labels" -}}
app.kubernetes.io/name: {{ include "authkit.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
