import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  TextInput,
  Select,
  SelectItem,
  DatePicker,
  DatePickerInput,
  TextArea,
  Button,
  Grid,
  Column
} from "@carbon/react";
import { Save } from '@carbon/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { createSite, getSiteById, updateSite } from '../../lib/services/siteService';
import styles from '../../styles/pages/site/CreateSite.module.scss';
import countryData from '../../data/countries.json';

interface FormData {
  name: string;
  primary_minerals: string;
  investor_name: string;
  start_date: string;
  site_country: string;
  coordinates: string;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

interface CountryOption {
  value: string; 
  text: string; 
}

const countryOptions: CountryOption[] = countryData;

// Helper function to format YYYY-MM-DD to DD/MM/YYYY
// const formatDateForDatePicker = (isoDate: string): string => {
//   if (!isoDate) return '';
//   const parts = isoDate.split('-');
//   if (parts.length === 3) {
//     return `${parts[2]}/${parts[1]}/${parts[0]}`;
//   }
//   return isoDate; // Return original if not in expected format
// };

// Helper function to parse display format coordinates to a number[][], validating them.
const parseDisplayCoordinates = (displayCoords: string): number[][] | null => {
  if (!displayCoords.trim()) return null;

  const points = displayCoords.trim().split(') (');
  const coordinatesArray: number[][] = [];

  for (const point of points) {
    const cleanedPoint = point.replace(/\(|\)/g, ''); // Remove parentheses
    const parts = cleanedPoint.split(',');

    if (parts.length !== 2) return null; // Invalid format

    const latStr = parts[0].trim();
    const lonStr = parts[1].trim();

    const latMatch = latStr.match(/^(\d+\.\d+)°\s*([NS])$/);
    const lonMatch = lonStr.match(/^(\d+\.\d+)°\s*([EW])$/);

    if (!latMatch || !lonMatch) return null; // Invalid degree format

    let lat = parseFloat(latMatch[1]);
    const latDir = latMatch[2];
    let lon = parseFloat(lonMatch[1]);
    const lonDir = lonMatch[2];

    if (latDir === 'S') lat = -lat;
    if (lonDir === 'W') lon = -lon;

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null; // Invalid range
    }
    coordinatesArray.push([lat, lon]);
  }
  return coordinatesArray;
};

// Helper function to format database coordinates (JSON string) to display string
const formatDbCoordinatesToDisplay = (dbCoordsJsonString: string): string => {
  if (!dbCoordsJsonString) return '';
  try {
    const coordsArray = JSON.parse(dbCoordsJsonString);
    if (!Array.isArray(coordsArray)) return '';

    // Check if it's a single point [lat, long] or an array of points [[lat1, long1], ...]
    const pointsToFormat = (Array.isArray(coordsArray[0]) ? coordsArray : [coordsArray]) as number[][];

    return pointsToFormat.map(point => {
      if (!Array.isArray(point) || point.length !== 2) return '';
      const [lat, lon] = point;
      if (typeof lat !== 'number' || typeof lon !== 'number') return '';

      const latDir = lat >= 0 ? 'N' : 'S';
      const lonDir = lon >= 0 ? 'E' : 'W';
      return `(${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir})`;
    }).join(' ');
  } catch (e) {
    console.error("Error formatting DB coordinates to display:", e);
    return ''; // Or return dbCoordsJsonString if it's not parseable to show the raw data
  }
};

const CreateSite: React.FC = () => {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const { user, currentOrgId } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    primary_minerals: '',
    investor_name: '',
    start_date: '',
    site_country: '',
    coordinates: '',
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [pageTitle, setPageTitle] = useState('Create Site');
  const [submitButtonText, setSubmitButtonText] = useState('Save');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (siteId) {
      setIsEditMode(true);
      setPageTitle('Edit Site');
      setSubmitButtonText('Update');
      setLoading(true);
      const fetchSiteData = async () => {
        try {
          const site = await getSiteById(siteId);
          if (site) {
            setFormData({
              name: site.name || '',
              primary_minerals: site.primary_minerals || '',
              investor_name: site.investor_name || '',
              start_date: site.start_date ? new Date(site.start_date).toISOString().split('T')[0] : '',
              site_country: site.site_country || '',
              coordinates: site.coordinates ? formatDbCoordinatesToDisplay(JSON.stringify(site.coordinates)) : '',
              notes: site.description || ''
            });
            const initialTouched: { [key: string]: boolean } = {};
            Object.keys(formData).forEach(key => {
              initialTouched[key] = true;
            });
            setTouched(initialTouched);
          } else {
            navigate('/sites');
          }
        } catch (error) {
          console.error("Failed to fetch site data:", error);
          navigate('/sites');
        } finally {
          setLoading(false);
        }
      };
      fetchSiteData();
    } else {
      setIsEditMode(false);
      setPageTitle('Create Site');
      setSubmitButtonText('Save');
    }
  }, [siteId, navigate]);

  const validateCoordinates = (coords: string): boolean => {
    if (!coords.trim()) return true;
    const parsed = parseDisplayCoordinates(coords);
    return parsed !== null && parsed.length > 0;
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        return !value.trim() ? 'Site name is required' : '';
      case 'coordinates':
        if (!value.trim() && isEditMode) return '';
        if (!value.trim() && !isEditMode) return 'Coordinates are required';
        if (value.trim() && !validateCoordinates(value)) {
          return 'Invalid format. Use e.g., (18.6273° N, 6.6908° E) or (18.4295° N, 6.5238° E) (18.4839° N, 6.2683° E)';
        }
        return '';
      case 'site_country':
        return !value.trim() ? 'Country is required' : '';
      case 'primary_minerals':
        return !value.trim() ? 'Primary minerals are required' : '';
      case 'start_date':
        return !value.trim() ? 'Start date is required' : '';
      default:
        return '';
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof FormData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    const touchedAndValid = Object.keys(touched).every(field => !errors[field]);
    
    const requiredFields = ['name', 'primary_minerals', 'start_date', 'site_country', 'coordinates'];
    const allRequiredFilled = requiredFields.every(field => formData[field as keyof FormData].trim());
    
    if (isEditMode) {
      const noCurrentErrors = Object.values(errors).every(error => !error);
      return allRequiredFilled && noCurrentErrors;
    }

    return allRequiredFilled && touchedAndValid && Object.values(errors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let currentErrors: FormErrors = {};
    let allFieldsValid = true;
    Object.keys(formData).forEach(key => {
      const fieldName = key as keyof FormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        currentErrors[fieldName] = error;
        allFieldsValid = false;
      }
    });
    setErrors(currentErrors);
    setTouched(prev => {
        const newTouched = {...prev};
        Object.keys(formData).forEach(key => newTouched[key] = true);
        return newTouched;
    });

    if (!allFieldsValid || !isFormValid()) {
        console.log("Form is not valid", errors, formData, touched);
        return; 
    }

    if (!currentOrgId) {
      setErrors(prev => ({ ...prev, form: 'Your organisation context is not set. Please re-login or contact support.' }));
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error('User must be authenticated');

      const parsedCoords = parseDisplayCoordinates(formData.coordinates);
      if (!parsedCoords && formData.coordinates.trim()) { // if not empty and parse failed
        setErrors(prev => ({ ...prev, coordinates: 'Invalid coordinates format. Please check and try again.' }));
        setLoading(false);
        return;
      }
      
      const coordinatesForDb = parsedCoords ? JSON.stringify(parsedCoords) : ""; // Default to empty string instead of null

      const sitePayload = {
        name: formData.name,
        coordinates: parsedCoords ? JSON.parse(coordinatesForDb) : null,
        site_country: formData.site_country,
        primary_minerals: formData.primary_minerals,
        investor_name: formData.investor_name || null,
        start_date: formData.start_date,
        description: formData.notes || null,
      };

      if (isEditMode && siteId) {
        await updateSite(siteId, sitePayload);
      } else {
        await createSite(sitePayload, currentOrgId, user?.id);
      }

      navigate('/sites');
    } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} site:`, err);
      setErrors(prev => ({ ...prev, form: err instanceof Error ? err.message : 'An unexpected error occurred' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title={pageTitle} />
        <p className={styles.description}>
          {isEditMode 
            ? 'Update the details of your site.' 
            : 'Here you should be able to create the new site you are exploring and add it to your portfolio to start creating reports.'}
        </p>

        {errors.form && (
          <div className={styles.formErrorNotification} role="alert">
            {errors.form}
          </div>
        )}

        <div className={styles.formContainer}>
          {loading && isEditMode && !Object.keys(formData).some(key => formData[key as keyof FormData] && key !== 'investor_name') && (
            <p>Loading site data...</p>
          )}
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <TextInput
                  id="name"
                  labelText="Site Name"
                  placeholder="Enter the name of the mine..."
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  invalid={touched.name && !!errors.name}
                  invalidText={errors.name}
                  readOnly={loading && isEditMode}
                />
                <DatePicker 
                  datePickerType="single"
                  dateFormat="d/m/Y"
                  minDate={new Date()}
                  onChange={dates => {
                    const date = Array.isArray(dates) ? dates[0] : dates;
                    if (date) {
                      const isoDate = date.toISOString().split('T')[0];
                      handleChange('start_date', isoDate);
                    } else {
                      handleChange('start_date', '');
                    }
                  }}
                >
                  <DatePickerInput
                    id="start_date"
                    labelText="Exploration's Start date"
                    placeholder="dd/mm/yyyy"
                    defaultValue={formData.start_date}
                    invalid={touched.start_date && !!errors.start_date}
                    invalidText={errors.start_date}
                    readOnly={loading && isEditMode}
                  />
                </DatePicker>
              </div>

              <div className={styles.formRow}>
                <TextInput
                  id="primary_minerals"
                  labelText="Primary Minerals"
                  placeholder="Start typing a mineral..."
                  value={formData.primary_minerals}
                  onChange={e => handleChange('primary_minerals', e.target.value)}
                  onBlur={() => handleBlur('primary_minerals')}
                  invalid={touched.primary_minerals && !!errors.primary_minerals}
                  invalidText={errors.primary_minerals}
                  readOnly={loading && isEditMode}
                />
                <TextInput
                  id="investor_name"
                  labelText="Investor's Name (Optional)"
                  placeholder="Enter the client or organisation name..."
                  value={formData.investor_name}
                  onChange={e => handleChange('investor_name', e.target.value)}
                  onBlur={() => handleBlur('investor_name')}
                  readOnly={loading && isEditMode}
                />
              </div>

              <div className={styles.formRow}>
                <Select
                  id="site_country"
                  labelText="Country"
                  value={formData.site_country}
                  onChange={e => handleChange('site_country', e.target.value)}
                  onBlur={() => handleBlur('site_country')}
                  invalid={touched.site_country && !!errors.site_country}
                  invalidText={errors.site_country}
                  readOnly={(loading && isEditMode)}
                  disabled={(loading && isEditMode)}
                >
                  <SelectItem
                    disabled
                    hidden
                    value=""
                    text="Select one option..."
                  />
                  {countryOptions.map(country => (
                    <SelectItem
                      key={country.value}
                      value={country.value}
                      text={country.text}
                    />
                  ))}
                </Select>

                <TextInput
                  id="coordinates"
                  labelText="Site Coordinates"
                  placeholder="e.g., (18.6273° N, 6.6908° E)"
                  helperText="Single point: (18.6273° N, 6.6908° E). Multiple: (18.4295° N, 6.5238° E) (18.4839° N, 6.2683° E)"
                  value={formData.coordinates}
                  onChange={e => handleChange('coordinates', e.target.value)}
                  onBlur={() => handleBlur('coordinates')}
                  invalid={touched.coordinates && !!errors.coordinates}
                  invalidText={errors.coordinates}
                  readOnly={loading && isEditMode}
                />
              </div>

              <TextArea
                id="notes"
                labelText="Notes (Optional)"
                placeholder="Add any relevant notes about the site..."
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                rows={4}
                maxCount={500}
                readOnly={loading && isEditMode}
              />
            </div>

            <div className={styles.formActions}>
              <Button
                kind="secondary"
                onClick={() => navigate('/sites')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid() || loading}
                renderIcon={Save}
              >
                {loading ? (isEditMode ? 'Updating...' : 'Saving...') : submitButtonText}
              </Button>
            </div>
          </form>
        </div>
      </AppLayout>
  );
};

export default CreateSite; 