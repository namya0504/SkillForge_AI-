import { useState, useEffect, useCallback } from 'react';
import { skillAPI, roleAPI, resumeAPI } from '../services/api';

/**
 * useOnboardingStatus — Reusable hook that checks whether the current user
 * has completed each onboarding step.
 *
 * Returns:
 *   { hasResume, hasSkills, hasTargetRole, isComplete, isLoading, refresh }
 *
 * isComplete === true only when ALL three steps are done.
 * Call refresh() to re-fetch the status (e.g. after a user action).
 */
export const useOnboardingStatus = () => {
  const [status, setStatus] = useState({
    hasResume: false,
    hasSkills: false,
    hasTargetRole: false,
    isComplete: false,
    isLoading: true,
  });

  const fetchStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, isLoading: true }));

    let hasResume = false;
    let hasSkills = false;
    let hasTargetRole = false;

    try {
      const resumeRes = await resumeAPI.getCurrent();
      hasResume = !!(resumeRes?.resume && resumeRes.resume.parsedStatus === 'completed');
    } catch {
      // No resume or endpoint error — treat as not uploaded
    }

    try {
      const skillsRes = await skillAPI.getSkills();
      const skills = skillsRes?.skills || skillsRes || [];
      hasSkills = Array.isArray(skills) && skills.length > 0;
    } catch {
      // No skills
    }

    try {
      const roleRes = await roleAPI.getUserTargetRole();
      hasTargetRole = !!(roleRes?.targetRole || roleRes?.customTargetRole);
    } catch {
      // No target role
    }

    setStatus({
      hasResume,
      hasSkills,
      hasTargetRole,
      isComplete: hasSkills && hasTargetRole,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...status, refresh: fetchStatus };
};
