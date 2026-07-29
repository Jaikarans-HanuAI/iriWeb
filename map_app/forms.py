from django import forms
from .models import UploadedFile


class FileUploadForm(forms.ModelForm):
    class Meta:
        model = UploadedFile
        fields = ['file']
        widgets = {
            'file': forms.ClearableFileInput(attrs={
                'class': 'file-input',
                'accept': '.csv,.gpx',
                'id': 'file-upload',
            }),
        }

    def clean_file(self):
        file = self.cleaned_data['file']
        ext = file.name.rsplit('.', 1)[-1].lower()

        valid_types = {
            'csv': 'text/csv',
            'gpx': ['application/gpx+xml', 'text/xml', 'application/xml'],
        }

        if ext not in valid_types:
            raise forms.ValidationError(
                f"Unsupported file type '.{ext}'. Please upload CSV or GPX files only."
            )

        return file
