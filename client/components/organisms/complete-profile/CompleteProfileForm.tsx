"use client";

import { useCompleteFormContext } from "@/context/completeFormContext";
import PersonalInfoForm from "./steps/PersonalInfoForm";
import { useForm } from "react-hook-form";
import {
  CompleteFormData,
  addressInfoSchema,
  interestsSchema,
  personalInfoSchema,
} from "@/schemas/CompleteFormSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import AddressAndLocation from "./steps/AddressAndLocation";

import Interests from "./steps/Interests";
import { useMutation } from "@tanstack/react-query";
import { completeProfile } from "@/services/requests/completeProfile";
import { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { getLocationByIp } from "@/hooks/useGeoLocation";
import { useEffect, useState } from "react";
import { IUserAddres } from "@/types/geoLocation";

const steps = [
  {
    id: "Step 1",
    name: "Personal information",
  },
  {
    id: "Step 2",
    name: "Add your loaction and photos",
  },
  { id: "Step 3", name: "Add your interests" },
];

export default function CompleteProfileForm() {
  const [longitude, setLongitude] = useState<number>();
  const [latitude, setLatitude] = useState<number>();
  const {
    currentStep,
    setCurrentStep,
    setPreviousStep,
    formValues,
    updateFormValues,
  } = useCompleteFormContext();

  const router = useRouter();

  const { mutate, isPending } = useMutation<
    AxiosResponse,
    Error,
    CompleteFormData,
    unknown
  >({
    mutationFn: completeProfile,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile completed successfully",
      });
      reset();
      router.replace("/home");
    },
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to complete profile",
        variant: "destructive",
      });
    },
  });

  const getCurrentSchema = () => {
    switch (currentStep) {
      case 0:
        return personalInfoSchema;
      case 1:
        return addressInfoSchema;
      case 2:
        return interestsSchema;
      default:
        return personalInfoSchema;
    }
  };

  const {
    formState: { errors },
    handleSubmit,
    control,
    reset,
  } = useForm<CompleteFormData>({
    resolver: zodResolver(getCurrentSchema()),
    defaultValues: formValues,
    mode: "onChange",
  });

  const onSubmit = async (data: CompleteFormData) => {
    try {
      if (currentStep === steps.length - 1) {
        const finalData = { ...formValues, ...data };
        if (typeof finalData.latitude === "undefined") {
          finalData.latitude = latitude;
        }
        if (typeof finalData.longitude === "undefined") {
          finalData.longitude = longitude;
        }

        // eslint-disable-next-line no-unused-vars
        const transformedData = {
          ...finalData,
          interests: data.interests.map((interest) => interest.value),
        } as unknown as CompleteFormData;
        mutate(transformedData);
        // reset();
      }

      if (currentStep < steps.length - 1) {
        updateFormValues(data);
        setPreviousStep(currentStep);
        setCurrentStep((step) => step + 1);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Form submission error: ", error);
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setPreviousStep(currentStep);
      setCurrentStep((step) => step - 1);
    }
  };

  const rederForms = () => {
    switch (currentStep) {
      case 0:
        return <PersonalInfoForm control={control} errors={errors} />;
      case 1:
        return <AddressAndLocation control={control} errors={errors} />;
      case 2:
        return <Interests control={control} errors={errors} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    getLocationByIp().then((data: IUserAddres | undefined) => {
      setLongitude(data?.lon);
      setLatitude(data?.lat);
    });
  }, []);

  return (
    <section className="absolute inset-0 flex flex-col gap-4 p-24">
      <h1 className="text-center mb-2 font-bold text-xl">
        Welcome! Let&apos;s complete your profile
      </h1>
      {/* steps */}
      <nav aria-label="Progress" className="bg-[#fcf7fa]">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step, index) => (
            <li key={step.name} className="md:flex-1">
              {currentStep > index ? (
                <div className="group flex w-full flex-col border-l-4 border-primary py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className="text-sm font-medium text-primary transition-colors ">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              ) : currentStep === index ? (
                <div
                  className="flex w-full flex-col border-l-4 border-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                  aria-current="step"
                >
                  <span className="text-sm font-medium text-primary">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              ) : (
                <div className="group flex w-full flex-col border-l-4 border-gray-200 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className="text-sm font-medium text-gray-500 transition-colors">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={handleSubmit(onSubmit)}>
        {rederForms()}

        <div className="mt-8 pt-5">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={currentStep === 0}
              className="rounded bg-white px-2 py-1 text-sm font-semibold text-primary/70 shadow-sm ring-1 ring-inset ring-primary/30 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <button
              disabled={isPending}
              type="submit"
              className="rounded bg-white px-2 py-1 text-sm font-semibold text-primary/70 shadow-sm ring-1 ring-inset ring-primary/30 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentStep === steps.length - 1 ? (
                "Submit"
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
