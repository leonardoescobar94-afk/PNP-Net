import React from 'react';

export const SCIENTIFIC_REFERENCES: React.ReactNode[] = [
  <>Davies JL, Lodermeier KA, Klein DM, et al. <i>Composite nerve conduction scores and signs for diagnosis and somatic staging of diabetic polyneuropathy: Mid North American ethnic cohort survey.</i> Muscle Nerve. 2023;68(1):29–38. doi:10.1002/mus.27793.</>,
  <>Chen S, Andary M, Buschbacher R, et al. <i>Electrodiagnostic reference values for upper and lower limb nerve conduction studies in adult populations.</i> Muscle Nerve. 2016;54(3):371–377. doi:10.1002/mus.25203.</>,
  <>Dillingham T, Chen S, Andary M, et al. <i>Establishing high-quality reference values for nerve conduction studies: A report from the Normative Data Task Force of the American Association of Neuromuscular &amp; Electrodiagnostic Medicine.</i> Muscle Nerve. 2016;54(3):366–370. doi:10.1002/mus.25204.</>,
  <>Buschbacher RM. <i>Tibial nerve motor conduction to the abductor hallucis.</i> Am J Phys Med Rehabil. 1999;78(6 Suppl):S15–S20.</>,
  <>Buschbacher RM. <i>Peroneal nerve motor conduction to the extensor digitorum brevis.</i> Am J Phys Med Rehabil. 1999;78(6 Suppl):S26–S31.</>,
  <>Buschbacher RM. <i>Ulnar nerve motor conduction to the abductor digiti minimi.</i> Am J Phys Med Rehabil. 1999;78(6 Suppl):S9–S14.</>,
  <>Buschbacher RM. <i>Sural and saphenous 14-cm antidromic sensory nerve conduction studies.</i> Am J Phys Med Rehabil. 2003;82(6):421–426.</>
];

export const ScientificReferences: React.FC<{ className?: string }> = ({ className = '' }) => (
  <ol className={`list-decimal pl-5 space-y-3 ${className}`}>
    {SCIENTIFIC_REFERENCES.map((reference, index) => <li key={index}>{reference}</li>)}
  </ol>
);
