import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  Home,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trees,
  Wind,
  Flame,
  Car,
  Sofa,
  Bed,
  Bath,
  Upload,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEstate } from '../context/EstateContext';
import { FurnishingStatus, MLModelType, PropertyInput, YesNo } from '../types/estate';
import {
  ISOMETRIC_CARD_HOUSE_IMAGE,
  LuxuryHouseScene,
} from '../components/three/LuxuryHouseScene';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { encodeToColumnsMap } from '../services/mlEngine';
import { CSVImportModal } from '../components/csv/CSVImportModal';

const STEPS = [
  { id: 1, title: 'Property Details', subtitle: 'Basic information' },
  { id: 2, title: 'Amenities', subtitle: 'Available facilities' },
  { id: 3, title: 'Furnishing', subtitle: 'Furnishing status' },
  { id: 4, title: 'Model Selection', subtitle: 'Choose ML algorithm' },
  { id: 5, title: 'Generate Valuation', subtitle: 'Verify & run prediction' },
];

export const PredictPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentInputs,
    setCurrentInputs,
    selectedModel,
    setSelectedModel,
    runPrediction,
    isPredicting,
    modelMetrics,
    currency,
    exportHistoryCSV,
    addToast,
  } = useEstate();

  const [step, setStep] = useState<number>(1);
  const [formState, setFormState] = useState<PropertyInput>(currentInputs);
  const [chosenModel, setChosenModel] = useState<MLModelType>(selectedModel);
  const [areaError, setAreaError] = useState<string>('');
  const [progressStage, setProgressStage] = useState<number>(0);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);

  const updateField = <K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) => {
    const next = { ...formState, [key]: value };
    setFormState(next);
    setCurrentInputs(next);
    if (key === 'area') {
      const num = Number(value);
      if (isNaN(num) || num < 500 || num > 30000) {
        setAreaError('Please enter a valid property area between 500 and 30,000 sq ft.');
      } else {
        setAreaError('');
      }
    }
  };

  const toggleAmenity = (
    key: 'mainroad' | 'guestroom' | 'basement' | 'hotwaterheating' | 'airconditioning' | 'prefarea'
  ) => {
    const nextVal: YesNo = formState[key] === 'yes' ? 'no' : 'yes';
    updateField(key, nextVal);
  };

  const applyPresetProperty = (label: string, preset: PropertyInput) => {
    setFormState(preset);
    setCurrentInputs(preset);
    setAreaError('');
    addToast('Preset Loaded', `Applied "${label}" configuration.`, 'info');
  };

  const handleNextStep = () => {
    if (step === 1 && (formState.area < 500 || formState.area > 30000)) {
      setAreaError('Please enter a valid property area between 500 and 30,000 sq ft.');
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handlePrevStep = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleExecutePrediction = async () => {
    if (isPredicting) return;
    if (formState.area < 500 || formState.area > 30000) {
      setAreaError('Please enter a valid property area between 500 and 30,000 sq ft.');
      setStep(1);
      return;
    }

    setProgressStage(1);
    const timer1 = setTimeout(() => setProgressStage(2), 120);
    const timer2 = setTimeout(() => setProgressStage(3), 240);

    try {
      await runPrediction(formState, chosenModel);
      clearTimeout(timer1);
      clearTimeout(timer2);
      setProgressStage(0);
      navigate('/results');
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setProgressStage(0);
    }
  };

  const encodedPreview = encodeToColumnsMap(formState);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Quick Benchmark Presets + CSV Import/Export */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
            Predict House Price
          </h1>
          <p className="text-sm text-[#5E6D82] dark:text-[#94A3B8] mt-1">
            Provide property details or import property data from CSV to get an AI-powered price
            estimate.
          </p>
        </div>

        {/* Benchmark Presets & CSV Data Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCSVModalOpen(true)}
            data-testid="predict-import-csv-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportHistoryCSV()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF632B] text-[#11151C] dark:text-[#CBD5E1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FF632B]" />
            <span>Export History CSV</span>
          </button>

          <span className="text-xs text-[#5E6D82] dark:text-[#94A3B8] ml-1">
            Presets:
          </span>
          <button
            type="button"
            onClick={() =>
              applyPresetProperty('Prime Luxury Villa', {
                area: 7420,
                bedrooms: 4,
                bathrooms: 2,
                stories: 3,
                mainroad: 'yes',
                guestroom: 'no',
                basement: 'no',
                hotwaterheating: 'no',
                airconditioning: 'yes',
                parking: 2,
                prefarea: 'yes',
                furnishingstatus: 'furnished',
              })
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF632B] text-[#11151C] dark:text-[#CBD5E1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Prime Villa (7,420 sq ft)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPresetProperty('Modern Family Home', {
                area: 2400,
                bedrooms: 3,
                bathrooms: 2,
                stories: 2,
                mainroad: 'yes',
                guestroom: 'no',
                basement: 'no',
                hotwaterheating: 'no',
                airconditioning: 'yes',
                parking: 1,
                prefarea: 'yes',
                furnishingstatus: 'semi-furnished',
              })
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF632B] text-[#11151C] dark:text-[#CBD5E1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Family Home (2,400 sq ft)
          </button>
        </div>
      </div>

      {/* Main Split Workspace matching Reference Mockup Top-Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 Cols): Horizontal Numbered Stepper + Main Form Card */}
        <div className="lg:col-span-8 space-y-6">
          {/* Horizontal Stepper Bar matching reference image */}
          <div className="flex items-center justify-between px-2 sm:px-6">
            {STEPS.map((s, idx) => {
              const isCurrent = step === s.id;
              const isDone = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(s.id)}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-[#FF7A45] to-[#FF5520] text-white shadow-md shadow-[#FF632B]/30 scale-105'
                          : isDone
                          ? 'bg-[#FF632B]/15 text-[#FF632B] border border-[#FF632B]'
                          : 'bg-slate-200 dark:bg-[#181E27] text-[#5E6D82] dark:text-[#94A3B8]'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : s.id}
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isCurrent
                          ? 'text-[#11151C] dark:text-white'
                          : 'text-[#5E6D82] dark:text-[#94A3B8]'
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-4 rounded ${
                        step > s.id
                          ? 'bg-[#FF632B]'
                          : 'bg-slate-200 dark:bg-[#78879B]/25'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Main Form Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_12px_40px_rgb(15,23,42,0.06)] space-y-6">
            <AnimatePresence mode="wait">
              {/* STEP 1: PROPERTY DETAILS (With 3D Isometric House Miniature on Left + Inputs on Right) */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                      Property Details
                    </h2>
                    <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                      Enter the basic information about the property.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left 5 cols: 3D Isometric House Render matching Reference Mockup */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200/70 dark:border-[#78879B]/20">
                      <img
                        src={ISOMETRIC_CARD_HOUSE_IMAGE}
                        alt="3D Isometric House Miniature"
                        referrerPolicy="no-referrer"
                        className="w-full h-44 object-contain"
                      />
                      <span className="text-[11px] font-mono font-semibold text-[#5E6D82] dark:text-[#94A3B8] mt-1">
                        {formatNumber(formState.area)} sq.ft. · {formState.stories} Stories
                      </span>
                    </div>

                    {/* Right 7 cols: Clean Inputs matching Reference Mockup */}
                    <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Area (sq. ft.) */}
                      <div className="sm:col-span-1 space-y-1.5">
                        <label
                          htmlFor="area-input"
                          className="text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1]"
                        >
                          Area (sq. ft.)
                        </label>
                        <div className="relative">
                          <Home className="w-4 h-4 text-[#78879B] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="area-input"
                            type="number"
                            min={500}
                            max={30000}
                            step={50}
                            value={formState.area}
                            onChange={(e) => updateField('area', Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF632B]"
                          />
                        </div>
                      </div>

                      {/* Bedrooms */}
                      <div className="sm:col-span-1 space-y-1.5">
                        <label
                          htmlFor="bedrooms-select"
                          className="text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1]"
                        >
                          Bedrooms
                        </label>
                        <div className="relative">
                          <Bed className="w-4 h-4 text-[#78879B] absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            id="bedrooms-select"
                            value={formState.bedrooms}
                            onChange={(e) => updateField('bedrooms', Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF632B]"
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bathrooms */}
                      <div className="sm:col-span-1 space-y-1.5">
                        <label
                          htmlFor="bathrooms-select"
                          className="text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1]"
                        >
                          Bathrooms
                        </label>
                        <div className="relative">
                          <Bath className="w-4 h-4 text-[#78879B] absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            id="bathrooms-select"
                            value={formState.bathrooms}
                            onChange={(e) => updateField('bathrooms', Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF632B]"
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Stories */}
                      <div className="sm:col-span-1 space-y-1.5">
                        <label
                          htmlFor="stories-select"
                          className="text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1]"
                        >
                          Stories
                        </label>
                        <div className="relative">
                          <Layers className="w-4 h-4 text-[#78879B] absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            id="stories-select"
                            value={formState.stories}
                            onChange={(e) => updateField('stories', Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF632B]"
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Parking Spaces */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label
                          htmlFor="parking-select"
                          className="text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1]"
                        >
                          Parking Spaces
                        </label>
                        <div className="relative">
                          <Car className="w-4 h-4 text-[#78879B] absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            id="parking-select"
                            value={formState.parking}
                            onChange={(e) => updateField('parking', Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF632B]"
                          >
                            {[0, 1, 2, 3].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Interactive Area Slider */}
                      <div className="sm:col-span-3 pt-2">
                        <div className="flex justify-between text-[11px] font-mono text-[#78879B] mb-1">
                          <span>Adjust Area Slider: {formatNumber(formState.area)} sq.ft.</span>
                          <span>Range: 1,650 – 16,200 sq.ft.</span>
                        </div>
                        <input
                          type="range"
                          min={1650}
                          max={16200}
                          step={50}
                          value={Math.min(16200, Math.max(1650, formState.area))}
                          onChange={(e) => updateField('area', Number(e.target.value))}
                          className="w-full accent-[#FF632B] cursor-pointer"
                        />
                        {areaError && <p className="text-xs text-red-500 mt-1">{areaError}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: PROPERTY AMENITIES */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                      Property Amenities
                    </h2>
                    <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                      Toggle available facilities and neighborhood access attributes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        key: 'mainroad' as const,
                        label: 'Main Road Access',
                        desc: 'Direct arterial road connectivity',
                        icon: Car,
                      },
                      {
                        key: 'guestroom' as const,
                        label: 'Guest Room',
                        desc: 'Dedicated private guest suite',
                        icon: Home,
                      },
                      {
                        key: 'basement' as const,
                        label: 'Basement',
                        desc: 'Subterranean structural level',
                        icon: Layers,
                      },
                      {
                        key: 'hotwaterheating' as const,
                        label: 'Hot Water Heating',
                        desc: 'Central thermal water system',
                        icon: Flame,
                      },
                      {
                        key: 'airconditioning' as const,
                        label: 'Air Conditioning',
                        desc: 'Central HVAC climate control',
                        icon: Wind,
                      },
                      {
                        key: 'prefarea' as const,
                        label: 'Preferred Area',
                        desc: 'Prime residential neighborhood zone',
                        icon: Trees,
                      },
                    ].map((item) => {
                      const active = formState[item.key] === 'yes';
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleAmenity(item.key)}
                          className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                            active
                              ? 'bg-[#FF632B]/10 border-[#FF632B] text-[#11151C] dark:text-white shadow-sm'
                              : 'bg-[#F8FAFC] dark:bg-[#11151C] border-slate-200 dark:border-[#78879B]/25 text-[#5E6D82] dark:text-[#94A3B8] hover:border-[#78879B]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-xl mt-0.5 ${
                                active
                                  ? 'bg-gradient-to-br from-[#FF7A45] to-[#FF5520] text-white'
                                  : 'bg-slate-200 dark:bg-[#181E27] text-[#78879B]'
                              }`}
                            >
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#11151C] dark:text-[#F1F5F9]">
                                {item.label}
                              </div>
                              <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                                {item.desc}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded ${
                              active ? 'text-[#FF632B]' : 'text-[#78879B]'
                            }`}
                          >
                            {formState[item.key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: FURNISHING */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                      Furnishing Status
                    </h2>
                    <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                      Select the interior completion level of the residence.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(
                      [
                        {
                          value: 'furnished',
                          title: 'Furnished',
                          subtitle: 'Turnkey luxury interior package',
                          encodingNote: 'Reference baseline',
                        },
                        {
                          value: 'semi-furnished',
                          title: 'Semi-Furnished',
                          subtitle: 'Built-in cabinetry & core fixtures',
                          encodingNote: 'semi-furnished = 1',
                        },
                        {
                          value: 'unfurnished',
                          title: 'Unfurnished',
                          subtitle: 'Architectural shell ready for custom fit-out',
                          encodingNote: 'unfurnished = 1',
                        },
                      ] as {
                        value: FurnishingStatus;
                        title: string;
                        subtitle: string;
                        encodingNote: string;
                      }[]
                    ).map((opt) => {
                      const selected = formState.furnishingstatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('furnishingstatus', opt.value)}
                          className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
                            selected
                              ? 'bg-[#FF632B]/10 border-[#FF632B] shadow-sm'
                              : 'bg-[#F8FAFC] dark:bg-[#11151C] border-slate-200 dark:border-[#78879B]/25 hover:border-[#78879B]'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Sofa
                                className={`w-5 h-5 ${
                                  selected ? 'text-[#FF632B]' : 'text-[#78879B]'
                                }`}
                              />
                              {selected && <Check className="w-4 h-4 text-[#FF632B]" />}
                            </div>
                            <div className="text-base font-bold text-[#11151C] dark:text-[#F1F5F9]">
                              {opt.title}
                            </div>
                            <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                              {opt.subtitle}
                            </p>
                          </div>
                          <div className="text-[11px] font-mono text-[#78879B] pt-2 border-t border-slate-200/60 dark:border-[#78879B]/20">
                            {opt.encodingNote}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 4: MODEL SELECTION */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                      Model Selection
                    </h2>
                    <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                      Choose your primary ML algorithm. You can also toggle Quick Compare on the
                      results screen.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        id: 'linear_regression' as MLModelType,
                        artifact: 'linear_model.pkl',
                        title: 'Linear Regression',
                        summary:
                          'Statistical regression model that predicts house price by finding a linear relationship between features and price.',
                      },
                      {
                        id: 'decision_tree' as MLModelType,
                        artifact: 'decision_tree_model.pkl',
                        title: 'Decision Tree Regression',
                        summary:
                          'Tree-based regression model that splits data based on feature thresholds to predict house price.',
                      },
                    ].map((m) => {
                      const active = chosenModel === m.id;
                      const metric = modelMetrics[m.id];
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setChosenModel(m.id);
                            setSelectedModel(m.id);
                          }}
                          className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
                            active
                              ? 'bg-[#FF632B]/10 border-[#FF632B] shadow-sm'
                              : 'bg-[#F8FAFC] dark:bg-[#11151C] border-slate-200 dark:border-[#78879B]/25 hover:border-[#78879B]'
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-[#FF632B]">
                                {m.artifact}
                              </span>
                              {active && <Check className="w-4 h-4 text-[#FF632B]" />}
                            </div>
                            <div className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9]">
                              {m.title}
                            </div>
                            <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
                              {m.summary}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-200 dark:border-[#78879B]/20 flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="text-[#FF632B] font-bold">
                              R² = {metric.r2Score.toFixed(2)}
                            </span>
                            <span className="text-[#5E6D82] dark:text-[#94A3B8]">
                              RMSE: {formatCurrency(metric.rmse, currency, true)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 5: PREDICTION */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                      Generate AI Valuation
                    </h2>
                    <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                      Review encoded feature columns (model_columns.pkl) and execute inference.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/25 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#11151C] dark:text-[#CBD5E1]">
                        model_columns.pkl Encoding (13 Columns)
                      </span>
                      <span className="font-mono text-[#FF632B]">
                        {chosenModel === 'linear_regression'
                          ? 'Linear Regression'
                          : 'Decision Tree'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                      {Object.entries(encodedPreview).map(([col, val]) => (
                        <div
                          key={col}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#181E27] border border-slate-200/70 dark:border-[#78879B]/20 flex items-center justify-between gap-2"
                        >
                          <span className="text-[#5E6D82] dark:text-[#94A3B8] truncate" title={col}>
                            {col}
                          </span>
                          <span className="font-bold text-[#11151C] dark:text-white">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 space-y-4">
                    <button
                      type="button"
                      disabled={isPredicting}
                      onClick={handleExecutePrediction}
                      className="w-full py-4 px-6 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] disabled:opacity-60 transition-all shadow-xl shadow-[#FF632B]/25 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      {isPredicting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>
                            {progressStage === 1
                              ? 'Encoding 13 model_columns.pkl features...'
                              : progressStage === 2
                              ? 'Running trained ML model inference...'
                              : 'Preparing valuation report...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Generate AI Valuation</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                      <ShieldCheck className="w-4 h-4 text-[#FF632B]" />
                      <span>
                        Trained on Housing.csv · Side-by-side Quick Compare available on results
                        screen
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Step Navigation Bar matching Reference Mockup */}
            <div className="pt-5 border-t border-slate-200/80 dark:border-[#78879B]/20 flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={step === 1 || isPredicting}
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 disabled:opacity-40 hover:border-[#FF632B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] transition-all shadow-md shadow-[#FF632B]/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Next: {STEPS[step]?.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPredicting}
                  onClick={handleExecutePrediction}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#11151C] dark:bg-[#78879B] hover:opacity-90 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Calculate Price</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Interactive 3D House Model + Vertical Step Timeline Card */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_12px_40px_rgb(15,23,42,0.06)] space-y-6">
          <LuxuryHouseScene compact interactiveStep={step} />

          {/* Vertical Stepper Timeline */}
          <div className="space-y-4 pl-2">
            {STEPS.slice(0, 4).map((s, idx) => {
              const isCurrent = step === s.id;
              const isDone = step > s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className="relative flex items-start gap-3.5 cursor-pointer group"
                >
                  {idx < 3 && (
                    <div
                      className={`absolute left-2.5 top-6 w-0.5 h-8 ${
                        isDone ? 'bg-[#FF632B]' : 'bg-slate-200 dark:bg-[#78879B]/30'
                      }`}
                    />
                  )}
                  <div
                    className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 border-2 ${
                      isCurrent
                        ? 'border-[#FF632B] bg-[#FF632B] text-white ring-4 ring-[#FF632B]/20'
                        : isDone
                        ? 'border-[#FF632B] bg-[#FF632B] text-white'
                        : 'border-slate-300 dark:border-[#78879B] bg-white dark:bg-[#11151C]'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-bold ${
                        isCurrent
                          ? 'text-[#11151C] dark:text-white'
                          : 'text-[#5E6D82] dark:text-[#94A3B8]'
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-xs text-[#78879B]">{s.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Property Spec Pill Summary */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-[#78879B]/20 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <span className="text-[#78879B]">Area: </span>
              <span className="font-mono font-bold text-[#11151C] dark:text-white">
                {formatNumber(formState.area)} sq.ft.
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <span className="text-[#78879B]">Rooms: </span>
              <span className="font-mono font-bold text-[#11151C] dark:text-white">
                {formState.bedrooms}B / {formState.bathrooms}Ba
              </span>
            </div>
          </div>
        </div>
      </div>

      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onSelectSingleProperty={(inputs, model) => {
          setFormState(inputs);
          if (model) {
            setChosenModel(model);
          }
          setAreaError('');
        }}
        onBatchImported={(count) => {
          if (count === 1) {
            navigate('/results');
          } else {
            navigate('/history');
          }
        }}
      />
    </div>
  );
};
